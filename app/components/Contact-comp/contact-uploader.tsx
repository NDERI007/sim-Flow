import Papa from 'papaparse';
import ExcelJS from 'exceljs';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { validateAndFormatKenyanNumber } from '../../lib/validator/phoneN';
import { useAuthStore } from '../../lib/AuthStore';

type Contact = {
  name: string;
  phone: string;
};

const BATCH_SIZE = 500;

export default function Uploader({ onComplete }: { onComplete?: () => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [duplicates, setDuplicates] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    let parsedContacts: Contact[] = [];

    try {
      if (ext === 'csv') {
        const text = await file.text();
        const parsed = Papa.parse<Contact>(text, {
          header: true,
          transformHeader: (h: string) => h.trim().toLowerCase(),
        });
        parsedContacts = parsed.data.map((row: Contact) => ({
          name: String(row.name || '').trim(),
          phone: String(row.phone || '').trim(),
        }));
      } else if (ext === 'xlsx' || ext === 'xls') {
        parsedContacts = await parseExcel(file);
      } else {
        return setError(
          'Unsupported file format. Please upload .csv or .xlsx files.',
        );
      }

      // Use wrapper to validate and format
      const phoneMap = tryValidateWithInvalids(
        parsedContacts.map((c) => c.phone),
      );
      parsedContacts = parsedContacts
        .map((c, i) =>
          phoneMap.valid[i] ? { name: c.name, phone: phoneMap.valid[i] } : null,
        )
        .filter(Boolean) as Contact[];

      const { deduped, duplicates } = dedupeContacts(parsedContacts);

      if (deduped.length === 0) {
        return setError('No valid, unique contacts found.');
      }

      setContacts(deduped);
      setDuplicates(duplicates);
      setError('');
      setSuccess('');
    } catch (err) {
      console.error(err);
      setError('Failed to parse file. Please check format and try again.');
    }
  };

  const handleImport = async () => {
    if (!userId) return setError('You must be logged in.');
    if (!groupName.trim()) return setError('Please enter a group name.');
    if (contacts.length === 0) return setError('Please upload a contact file.');

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data: group, error: groupError } = await supabase
        .from('contact_groups')
        .upsert(
          { group_name: groupName.trim(), user_id: userId },
          { onConflict: 'group_name, user_id' },
        )
        .select()
        .single();
      if (groupError) throw groupError;

      for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
        const chunk = contacts.slice(i, i + BATCH_SIZE);

        const { data: insertedContacts, error: contactError } = await supabase
          .from('contacts')
          .upsert(
            chunk.map((c) => ({
              name: c.name,
              phone: c.phone,
              user_id: userId,
            })),
            { onConflict: 'phone,user_id' },
          )
          .select();

        if (contactError) throw contactError;

        const links = insertedContacts.map((contact) => ({
          contact_id: contact.id,
          group_id: group.id,
        }));

        const { error: linkError } = await supabase
          .from('contact_group_members')
          .upsert(links, { onConflict: 'contact_id,group_id' });

        if (linkError) throw linkError;
      }

      setSuccess(
        `Successfully imported ${contacts.length} contacts to "${group.name}"`,
      );
      setContacts([]);
      setDuplicates([]);
      setGroupName('');
      onComplete?.();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setContacts([]);
    setDuplicates([]);
    setGroupName('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="rounded-lg bg-slate-900 p-4 text-sm text-gray-200 shadow-md">
      <label className="mb-2 block font-medium text-gray-400">
        Upload CSV or Excel File
      </label>
      <input
        type="file"
        accept=".csv, .xlsx, .xls"
        onChange={handleFile}
        className="mb-4 w-full rounded px-4 py-2 text-gray-200 file:mr-4 file:rounded-md file:border-0 file:bg-pink-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-pink-800"
      />

      <label className="mb-1 block font-medium text-gray-400">Group Name</label>
      <input
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="e.g. Hi cousins"
        className="mb-4 w-full rounded bg-slate-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none"
      />

      {contacts.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Preview:</h3>
          <div className="max-h-40 overflow-y-auto rounded border bg-gray-50 p-2 text-sm text-gray-700 shadow-sm">
            {contacts.map((c, i) => (
              <div key={i} className="mb-1">
                {c.name} — {c.phone}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            ✅ {contacts.length} unique contacts
            {duplicates.length > 0 && (
              <> — ⚠️ {duplicates.length} duplicates skipped</>
            )}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-2 rounded bg-red-100 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-2 rounded bg-green-100 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleImport}
          className="mt-2 flex-1 rounded bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:bg-neutral-700"
          disabled={!contacts.length || !groupName.trim() || loading}
        >
          {loading ? 'Importing...' : 'Import Contacts'}
        </button>
        <button
          onClick={handleReset}
          className="mt-2 flex-1 rounded bg-violet-800 px-4 py-2 text-sm text-white hover:bg-violet-900"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// Helpers

function tryValidateWithInvalids(inputs: string[]): {
  valid: (string | null)[];
  invalid: string[];
} {
  const valid: (string | null)[] = [];
  const invalid: string[] = [];

  for (const raw of inputs) {
    try {
      const res = validateAndFormatKenyanNumber([raw]);
      valid.push(res[0]);
    } catch {
      valid.push(null);
      invalid.push(raw);
    }
  }

  return { valid, invalid };
}

function dedupeContacts(contacts: Contact[]) {
  const seen = new Set<string>();
  const deduped: Contact[] = [];
  const duplicates: Contact[] = [];

  for (const contact of contacts) {
    if (seen.has(contact.phone)) {
      duplicates.push(contact);
    } else {
      seen.add(contact.phone);
      deduped.push(contact);
    }
  }

  return { deduped, duplicates };
}

async function parseExcel(file: File): Promise<Contact[]> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  const contacts: Contact[] = [];

  sheet.eachRow((row, i) => {
    if (i === 1) return;
    const name = row.getCell(1).value?.toString().trim() || '';
    const phone = row.getCell(2).value?.toString().trim() || '';
    if (name && phone) contacts.push({ name, phone });
  });

  return contacts;
}
