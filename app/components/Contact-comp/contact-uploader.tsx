'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { useAuthStore } from '../../lib/AuthStore';
import { supabase } from '../../lib/supabase';
import { refreshContactGroups } from '../../lib/useContactGroups';

interface Contact {
  contact_name: string;
  contact_phone: string;
}

export default function ContactUploader() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const BATCH_SIZE = 100;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      let parsedContacts: Contact[] = [];

      if (ext === 'csv') {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true });
        parsedContacts = (parsed.data as any[]).map((row) => ({
          contact_name: String(row.name || '').trim(),
          contact_phone: normalizePhone(String(row.phone || '').trim()),
        }));
      } else if (ext === 'xlsx' || ext === 'xls') {
        parsedContacts = await parseExcel(file);
      } else {
        setError('Unsupported file format. Please upload .csv or .xlsx files.');
        return;
      }

      parsedContacts = parsedContacts.filter((c) =>
        /^07\d{8}$/.test(c.contact_phone),
      );

      if (parsedContacts.length === 0) {
        setError('No valid contacts found.');
        return;
      }

      setContacts(parsedContacts);
      setError('');
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
              ...c,
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

      setContacts([]);
      setGroupName('');
      await refreshContactGroups();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 shadow-md">
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Upload CSV or Excel File
      </label>
      <input
        type="file"
        accept=".csv, .xlsx, .xls"
        onChange={handleFile}
        className="mb-4 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-purple-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-800 hover:file:bg-purple-200"
      />

      <label className="mb-1 block text-sm font-medium text-gray-700">
        Group Name
      </label>
      <input
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="e.g. Nairobi Leads, Students, VIP List..."
        className="mb-4 w-full rounded border px-3 py-2 text-sm text-gray-700"
      />

      {contacts.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Preview:</h3>
          <div className="max-h-40 overflow-y-auto rounded border bg-gray-50 p-2 text-sm text-gray-700 shadow-sm">
            {contacts.map((c, i) => (
              <div key={i} className="mb-1">
                {c.contact_name} — {c.contact_phone}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleImport}
        className="mt-4 w-full rounded bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:bg-gray-300"
        disabled={!contacts.length || !groupName.trim() || loading}
      >
        {loading ? 'Importing...' : 'Import Contacts'}
      </button>
    </div>
  );
}

function normalizePhone(phone: string) {
  phone = phone.replace(/\s|-/g, '');
  if (phone.startsWith('+254')) return '0' + phone.slice(4);
  if (phone.startsWith('254')) return '0' + phone.slice(3);
  return phone;
}

async function parseExcel(file: File): Promise<Contact[]> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  const contacts: Contact[] = [];

  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const name = row.getCell(1).value?.toString().trim() || '';
    const phone = normalizePhone(row.getCell(2).value?.toString().trim() || '');
    if (name && /^07\d{8}$/.test(phone)) {
      contacts.push({ contact_name: name, contact_phone: phone });
    }
  });

  return contacts;
}
