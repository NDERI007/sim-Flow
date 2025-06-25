'use client';

import type { ContactGroup } from '@/app/lib/smsStore';

interface ContactGroupCardProps {
  group: ContactGroup;
  onEdit: (group: ContactGroup) => void;
  onDelete: (groupId: string) => void;
}

export default function ContactGroupCard({
  group,
  onEdit,
  onDelete,
}: ContactGroupCardProps) {
  const handleDelete = () => {
    const confirmDelete = confirm(`Delete group "${group.name}"?`);
    if (confirmDelete) {
      onDelete(group.id);
    }
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
          className="flex-1 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-600"
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
