'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { type ContactGroup } from '@/app/lib/smsStore';

interface Props {
  userId: string;
  editingGroup: ContactGroup | null;
  setEditingGroup: (group: ContactGroup | null) => void;
  onClose: () => void;
  onRefresh: () => void;
}

export default function ContactGroupForm({
  userId,
  editingGroup,
  setEditingGroup,
  onClose,
  onRefresh,
}: Props) {
  const [formData, setFormData] = useState({ name: '', contacts: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (editingGroup) {
      setFormData({
        name: editingGroup.name,
        contacts: editingGroup.contacts.join('\n'),
      });
    }
  }, [editingGroup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const contacts = formData.contacts
      .split(/[,\n]+/)
      .map((num) => num.trim())
      .filter(Boolean);

    try {
      if (editingGroup) {
        const { error } = await supabase
          .from('contact_groups')
          .update({
            name: formData.name,
            contacts,
          })
          .eq('id', editingGroup.id);

        if (error) throw error;
        setMessage('✅ Group updated!');
      } else {
        const { error } = await supabase.from('contact_groups').insert({
          name: formData.name,
          contacts,
          user_id: userId,
        });

        if (error) throw error;
        setMessage('✅ Group created!');
      }

      setFormData({ name: '', contacts: '' });
      setEditingGroup(null);
      onClose();
      onRefresh();
    } catch (error: any) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8 rounded-2xl border bg-white p-6 shadow-xl">
      <h2 className="mb-6 text-2xl font-semibold">
        {editingGroup ? 'Edit Group' : 'Create New Group'}
      </h2>

      {message && (
        <p
          className={`mb-4 font-medium ${
            message.includes('✅') ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium">Group Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-purple-500"
            placeholder="e.g. Marketing Team"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Phone Contacts
          </label>
          <textarea
            required
            value={formData.contacts}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, contacts: e.target.value }))
            }
            className="h-32 w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-purple-500"
            placeholder="Separate numbers with commas or new lines"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-purple-600 py-3 text-white shadow-lg hover:scale-105 disabled:opacity-50"
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
            className="flex-1 rounded-xl bg-gray-500 py-3 text-white shadow-lg hover:scale-105"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
