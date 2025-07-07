'use client';

import { useState } from 'react';

type Template = {
  id: string;
  name: string;
  content: string;
};

type Props = {
  template: Template;
  onUpdate: (id: string, name: string, content: string) => void;
  onDelete: (id: string) => void;
};

export default function TemplateCard({ template, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const [content, setContent] = useState(template.content);

  const handleDone = () => {
    if (name !== template.name || content !== template.content) {
      onUpdate(template.id, name, content); // Save only if changes
    }
    setEditing(false);
  };

  return (
    <div className="space-y-2 rounded-xl bg-gray-900 p-4 shadow-lg">
      {editing ? (
        <>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded bg-gray-800 p-2 text-white outline-none"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded bg-gray-800 p-2 text-white outline-none"
          />
          <button
            onClick={handleDone}
            className="rounded bg-pink-900 px-4 py-1 text-white hover:bg-pink-700"
          >
            Done
          </button>
          <button
            onClick={() => {
              setName(template.name);
              setContent(template.content);
              setEditing(false);
            }}
            className="ml-2 text-sm text-gray-400 hover:underline"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-gray-400">{template.name}</p>
          <p className="text-sm text-gray-300">{template.content}</p>
          <div className="mt-2 space-x-2">
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-blue-400 hover:underline"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(template.id)}
              className="text-sm text-red-500 hover:underline"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
