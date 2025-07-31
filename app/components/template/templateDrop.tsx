'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TemplateWithId } from '../../lib/schema/template';

interface TemplateDropdownProps {
  templates: TemplateWithId[];
  loading: boolean;
  onSelect: (template: TemplateWithId) => void;
  error: Error;
}

export default function TemplateDropdown({
  templates,
  loading,
  onSelect,
}: TemplateDropdownProps) {
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % templates.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev === 0 ? templates.length - 1 : prev - 1,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const template = templates[focusedIndex];
        if (template) {
          setSelectedName(template.label);
          onSelect(template);
          setOpen(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, focusedIndex, templates, onSelect]);

  return (
    <div className="relative mb-4 w-full" ref={dropdownRef}>
      <label className="mb-2 block text-sm font-medium text-gray-500">
        Use a Template
      </label>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setFocusedIndex(0); // Reset focus to first item
        }}
        className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white shadow focus:ring-2 focus:ring-pink-900"
      >
        {selectedName || 'Select a template'}
        <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg"
          role="listbox"
        >
          {loading ? (
            <p className="p-4 text-sm text-gray-400">Loading templates...</p>
          ) : templates.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No templates found</p>
          ) : (
            templates.map((template, index) => (
              <button
                key={template.id}
                type="button"
                role="option"
                aria-selected={focusedIndex === index}
                onClick={() => {
                  setSelectedName(template.label);
                  onSelect(template);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm ${
                  focusedIndex === index
                    ? 'bg-pink-900 text-white'
                    : 'text-gray-200 hover:bg-zinc-800'
                }`}
              >
                {template.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
