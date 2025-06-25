'use client';

import type { ContactGroup } from '@/app/lib/smsStore';
import { supabase } from '@/app/lib/supabase';
import { mutate } from 'swr';

interface ContactGroupCardProps {
  group: ContactGroup;
  onEdit: (group: ContactGroup) => void;
}

export default function ContactGroupCard({
  group,
  onEdit,
}: ContactGroupCardProps) {
  const handleDelete = async () => {
    const confirmDelete = confirm(`Delete group "${group.name}"?`);
    if (!confirmDelete) return;
    // Step 1: Delete from Supabase
    const { error } = await supabase
      .from('contact_groups')
      .delete()
      .eq('id', group.id);

    if (error) {
      alert(`❌ Failed to delete: ${error.message}`);
      return;
    }

    await mutate('contact-groups');
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl transition-shadow duration-300 hover:shadow-2xl">
      <div className="mb-4">
        <h3 className="mb-2 text-xl font-semibold text-gray-800">
          {group.name}
        </h3>
        <p className="text-sm text-gray-500">
          {group.contacts.length} contact
          {group.contacts.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="mb-4">
        <h4 className="mb-2 text-sm font-medium text-gray-700">Contacts:</h4>
        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
          {group.contacts.map((num, i) => (
            <span
              key={i}
              className="rounded-full bg-purple-100 px-3 py-1 text-sm whitespace-nowrap text-purple-800 shadow-sm"
            >
              {num}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(group)}
          className="flex-1 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-zinc-950"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
