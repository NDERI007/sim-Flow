'use client';

import { useState } from 'react';
import { Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { ContactGroup } from '../../lib/smsStore';

interface ContactGroupCardProps {
  id: ContactGroup['id'];
  group_name: ContactGroup['group_name'];
  contacts: ContactGroup['contacts'];
  onDelete: () => void;
  isDeleting?: boolean;
  onEdit?: () => void;
}

export default function ContactGroupCard({
  group_name,
  contacts,
  onDelete,
  isDeleting = false,
  onEdit,
}: ContactGroupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const MAX_DISPLAY = 5;
  const visibleContacts = expanded ? contacts : contacts.slice(0, MAX_DISPLAY);
  const hiddenCount = contacts.length - visibleContacts.length;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <h2 className="text-base font-semibold text-gray-100">{group_name}</h2>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-gray-400 hover:text-white"
              title="Edit group"
            >
              <Pencil className="h-5 w-5" />
            </button>
          )}

          {confirming ? (
            <>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="rounded bg-red-700 px-2 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={isDeleting}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={isDeleting}
              className="text-gray-400 hover:text-red-400"
              title="Delete group"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-400">
        {visibleContacts.map((contact, idx) => (
          <div key={idx} className="mb-1">
            {contact.name} — {contact.phone}
          </div>
        ))}

        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300"
          >
            {expanded ? (
              <>
                Show Less <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show {hiddenCount} More <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
