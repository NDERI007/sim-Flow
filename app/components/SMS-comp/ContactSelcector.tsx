'use client';

import { useEffect, useRef, useState } from 'react';
import { useGroupedContacts } from '../../lib/contactGroup';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

type Props = {
  selectedGroup: string[];
  onChange: (groupIds: string[]) => void;
};

export default function ContactGroupSelector({
  selectedGroup,
  onChange,
}: Props) {
  const { groups, error, isLoading } = useGroupedContacts();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggleGroup = (groupId: string) => {
    const isAlreadySelected = selectedGroup.includes(groupId);
    if (isAlreadySelected) {
      onChange(selectedGroup.filter((id) => id !== groupId));
    } else {
      onChange([...selectedGroup, groupId]);
    }
  };

  const isSelected = (id: string) => selectedGroup.includes(id);

  return (
    <div className="relative w-full max-w-xs" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          'flex w-full items-center justify-between rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm text-gray-300 shadow-sm transition hover:border-pink-900',
        )}
      >
        {selectedGroup.length > 0
          ? `${selectedGroup.length} group${selectedGroup.length > 1 ? 's' : ''} selected`
          : 'Select contact groups'}
        <ChevronDown className="ml-2 h-4 w-4" />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 shadow-lg">
          {isLoading ? (
            <p className="px-4 py-2 text-sm text-gray-400">Loading...</p>
          ) : error ? (
            <p className="px-4 py-2 text-sm text-red-500">
              Error loading contact groups: {error.message}
            </p>
          ) : groups.length === 0 ? (
            <p className="px-4 py-2 text-sm text-gray-400">
              No contact groups available
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto text-sm">
              {groups.map((group) => {
                const selected = isSelected(group.id);
                return (
                  <li
                    key={group.id}
                    className="flex cursor-pointer items-center space-x-3 px-4 py-2 hover:bg-zinc-800"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleGroup(group.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 accent-pink-600"
                    />
                    <span className="text-gray-200">{group.group_name}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
