'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { useAuthStore } from '../../lib/AuthStore';
import { supabase } from '../../lib/supabase';
import { refreshContactGroups } from '../../lib/useContactGroups';

interface Contact {
  name: string;
  phone: string;
}
interface ContactUploaderProps {
  onComplete?: () => void;
}

export default function ContactUploader({ onComplete }: ContactUploaderProps) {
  const { user } = useAuthStore();
  const userId = user?.id;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [duplicates, setDuplicates] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const BATCH_SIZE = 100;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    let parsedContacts: Contact[] = [];

    try {
      if (ext === 'csv') {
        const text = await file.text();
        const parsed = Papa.parse(text, {
          header: true,
          transformHeader: (h) => h.trim().toLowerCase(),
        });
        parsedContacts = (parsed.data as any[]).map((row) => ({
          name: String(row.name || '').trim(),
          phone: normalizePhone(String(row.phone || '').trim()),
        }));
      } else if (ext === 'xlsx' || ext === 'xls') {
        parsedContacts = await parseExcel(file);
      } else {
        return setError(
          'Unsupported file format. Please upload .csv or .xlsx files.',
        );
      }

      parsedContacts = parsedContacts.filter((c) => /^07\d{8}$/.test(c.phone));

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
          { name: groupName.trim(), user_id: userId },
          { onConflict: 'name, user_id' },
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
              contact_name: c.name,
              contact_phone: c.phone,
              user_id: userId,
            })),
            { onConflict: 'contact_phone,user_id' },
          )
          .select();

        if (contactError) throw contactError;

        const links = insertedContacts.map((contact) => ({
          contact_id: contact.id,
          group_id: group.id,
        }));

        const { error: linkError } = await supabase
          .from('contacts_with_groups')
          .upsert(links, { onConflict: 'contact_id,group_id' });

        if (linkError) throw linkError;
      }

      setSuccess(
        `Successfully imported ${contacts.length} contacts to "${group.name}"`,
      );
      setContacts([]);
      setDuplicates([]);
      setGroupName('');
      await refreshContactGroups();
      onComplete?.();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
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
        placeholder="e.g.Hi cousins"
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

// 📦 UTILITIES

function normalizePhone(phone: string) {
  phone = phone.replace(/\s|-/g, '');
  if (phone.startsWith('+254')) return '0' + phone.slice(4);
  if (phone.startsWith('254')) return '0' + phone.slice(3);
  return phone;
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

  if (workbook.worksheets.length !== 1) {
    throw new Error('Please upload an Excel file with a single sheet.');
  }

  const sheet = workbook.worksheets[0];
  const contacts: Contact[] = [];

  if (sheet.actualRowCount < 2) {
    throw new Error('The sheet appears to be empty or missing headers.');
  }

  sheet.eachRow((row, index) => {
    if (index === 1) return; // skip header
    const name = row.getCell(1).value?.toString().trim() || '';
    const phone = normalizePhone(row.getCell(2).value?.toString().trim() || '');
    if (name && /^07\d{8}$/.test(phone)) {
      contacts.push({ name, phone });
    }
  });

  return contacts;
}
