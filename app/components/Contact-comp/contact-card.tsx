'use client';

import { useState } from 'react';
import { Trash2, Pencil, ChevronDown } from 'lucide-react';
import { ContactGroup } from '../../lib/smsStore';
import { motion } from 'framer-motion';

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
  const hiddenCount = contacts.length - MAX_DISPLAY;
  const visibleContacts = expanded ? contacts : contacts.slice(0, MAX_DISPLAY);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <h2 className="text-base font-semibold text-gray-100">
          {group_name} ({contacts.length})
        </h2>

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

      <div className="relative text-sm text-gray-400">
        <motion.div
          layout
          initial={false}
          animate={{ height: expanded ? 'auto' : '12rem' }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden pr-2"
        >
          {contacts.map((contact, idx) => (
            <div key={idx} className="mb-1">
              {contact.name} — {contact.phone}
            </div>
          ))}
        </motion.div>

        {/* Gradient overlay hint (optional) */}
        {!expanded && hiddenCount > 0 && (
          <div className="pointer-events-none absolute bottom-9 left-0 h-12 w-full bg-gradient-to-t from-gray-950 to-transparent" />
        )}

        {/* Toggle button */}
        {contacts.length > MAX_DISPLAY && (
          <motion.button
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300"
            initial={false}
          >
            <span>{expanded ? 'Show Less' : `Show ${hiddenCount} More`}</span>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </motion.button>
        )}
      </div>
    </div>
  );
}
