'use client';

import { useState, useEffect } from 'react';
import { mutate } from 'swr';
import { useAuthStore } from '../../lib/AuthStore';
import { supabase } from '../../lib/supabase';
import { error } from 'console';

interface Contact {
  name: string;
  phone: string;
}

interface ContactGroup {
  id: string;
  group_name: string;
  contacts: {
    name: string;
    phone: string;
  }[];
}

interface Props {
  editingGroup: ContactGroup | null;
  setEditingGroup: (group: ContactGroup | null) => void;
  onClose: () => void;
}

export default function ContactGroupForm({
  editingGroup,
  setEditingGroup,
  onClose,
}: Props) {
  const { user } = useAuthStore();
  const userId = user?.id;

  const [groupName, setGroupName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([
    { name: '', phone: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (editingGroup) {
      setGroupName(editingGroup.group_name);
      setContacts(
        editingGroup.contacts.map((c) => ({
          name: c.name,
          phone: c.phone,
        })),
      );
    } else {
      setGroupName('');
      setContacts([{ name: '', phone: '' }]);
    }
  }, [editingGroup]);

  const handleContactChange = (
    index: number,
    field: 'name' | 'phone',
    value: string,
  ) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  };

  const addContactRow = () => {
    setContacts((prev) => [...prev, { name: '', phone: '' }]);
  };

  const removeContactRow = (index: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setMessage('❌ You must be logged in.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const cleanedContacts = contacts
        .filter((c) => c.name.trim() && c.phone.trim())
        .map((c) => ({
          name: c.name.trim(),
          phone: c.phone.trim(),
          user_id: userId,
        }));

      if (!editingGroup) {
        const { data: existing, error: existsError } = await supabase
          .from('contact_groups')
          .select('id')
          .eq('user_id', userId)
          .eq('group_name', groupName)
          .maybeSingle();

        if (existsError) throw existsError;

        if (existing) {
          setMessage('❌ A group with this name already exists.');
          setLoading(false);
          return;
        }
      }

      // 1. Insert/update group
      let groupId = editingGroup?.id;

      if (editingGroup) {
        const { error } = await supabase
          .from('contact_groups')
          .update({ group_name: groupName })
          .eq('id', groupId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('contact_groups')
          .insert({ group_name: groupName, user_id: userId })
          .select()
          .single();
        if (error) throw error;
        groupId = data.id;
      }

      // 2. Insert or update contacts
      const { data: insertedContacts, error: insertErr } = await supabase
        .from('contacts')
        .upsert(cleanedContacts, {
          onConflict: 'user_id,phone',
        })
        .select('id');

      if (insertErr) throw insertErr;

      // 3. Link to group
      const contactIds = insertedContacts.map((c) => c.id);
      const linkData = contactIds.map((contact_id) => ({
        contact_id,
        group_id: groupId,
      }));

      const { error: linkErr } = await supabase
        .from('contact_group_members')
        .upsert(linkData, {
          onConflict: 'contact_id, group_id',
        });

      if (linkErr) throw linkErr;

      setMessage('✅ Group saved!');
      setGroupName('');
      setContacts([{ name: '', phone: '' }]);
      setEditingGroup(null);
      onClose();
      // 2. Try to refresh materialized view
      const tryRefreshView = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
          const { error } = await supabase.rpc('refresh_contacts_view');
          if (!error) return true;
          console.warn(`View refresh failed (try ${i + 1}):`, error.message);
          await new Promise((res) => setTimeout(res, 500)); // wait before retry
        }
        return false;
      };

      const refreshSuccess = await tryRefreshView();

      // 3. Wait a bit to let the DB refresh, then revalidate
      setTimeout(
        async () => {
          await mutate('contacts-with-groups');
        },
        refreshSuccess ? 500 : 1000,
      );
    } catch (err) {
      if (err instanceof Error) {
        setMessage(`❌ ${err.message}`);
      } else {
        setMessage('Unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8 rounded-2xl bg-slate-900 p-6 text-gray-200 shadow-2xl">
      <h2 className="mb-6 text-2xl font-semibold">
        {editingGroup ? 'Edit Group' : 'Create New Group'}
      </h2>

      {message && (
        <p
          className={`mb-4 font-medium ${
            message.includes('✅') ? 'text-green-500' : 'text-pink-400'
          }`}
        >
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-400">
            Group Name
          </label>
          <input
            type="text"
            required
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-gray-100 outline-none"
            placeholder="e.g. Marketing Team"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-400">
            Contacts
          </label>
          {contacts.map((contact, index) => (
            <div key={index} className="mb-3 flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Name"
                value={contact.name}
                onChange={(e) =>
                  handleContactChange(index, 'name', e.target.value)
                }
                className="min-w-[150px] flex-1 rounded-xl bg-slate-800 px-4 py-2 text-gray-100 outline-none"
              />
              <input
                type="text"
                placeholder="Phone"
                value={contact.phone}
                onChange={(e) =>
                  handleContactChange(index, 'phone', e.target.value)
                }
                className="min-w-[150px] flex-1 rounded-xl bg-slate-800 px-4 py-2 text-gray-100 outline-none"
              />
              <button
                type="button"
                onClick={() => removeContactRow(index)}
                className="rounded bg-pink-900 px-3 text-white"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addContactRow}
            className="mt-2 rounded-xl bg-pink-900 px-4 py-2 text-white hover:bg-pink-800"
          >
            + Add Contact
          </button>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-pink-900 py-3 text-white shadow-lg hover:scale-105 disabled:opacity-50"
          >
            {loading
              ? 'Saving...'
              : editingGroup
                ? 'Update Group'
                : 'Create Group'}
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingGroup(null);
              onClose();
            }}
            className="flex-1 rounded-xl bg-slate-700 py-3 text-white shadow-lg hover:scale-105"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
