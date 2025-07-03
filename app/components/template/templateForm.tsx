'use client';

import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

type Props = {
  onCreate: (name: string, content: string) => Promise<void>;
  loading: boolean;
};

export default function TemplateForm({ onCreate, loading }: Props) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (loading || !name.trim() || !content.trim()) return;
    await onCreate(name.trim(), content.trim());
    setName('');
    setContent('');
    nameRef.current?.focus();
  };

  // Debounced draft save
  const debouncedSave = useDebouncedCallback(() => {
    if (name.trim() || content.trim()) {
      console.log('💾 Auto-saving draft:', { name, content });
      // You could save to localStorage, Supabase drafts, etc.
    }
  }, 1000); // 1s debounce

  // Trigger debounced save on changes
  useEffect(() => {
    debouncedSave();
  }, [name, content]);

  return (
    <div className="col-span-full space-y-2 rounded-xl bg-gray-900 p-4 shadow-lg">
      <input
        ref={nameRef}
        type="text"
        placeholder="Template Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded bg-gray-800 p-2 text-white placeholder-gray-400 outline-none"
      />
      <textarea
        placeholder="Message Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded bg-gray-800 p-2 text-white placeholder-gray-400 outline-none"
      ></textarea>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="rounded bg-pink-900 px-4 py-2 text-white hover:bg-pink-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Add Template'}
      </button>
    </div>
  );
}
