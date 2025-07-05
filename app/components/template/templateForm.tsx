'use client';

import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

type Props = {
  onCreate: (name: string, content: string) => Promise<void>;
  loading: boolean;
};

const DRAFT_KEY = 'template-draft';

export default function TemplateForm({ onCreate, loading }: Props) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Hold latest values
  const nameRef = useRef(name);
  const contentRef = useRef(content);

  // Keep refs up to date
  useEffect(() => {
    nameRef.current = name;
    contentRef.current = content;
  }, [name, content]);

  // Load saved draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.name) setName(draft.name);
        if (draft.content) setContent(draft.content);
      } catch (e) {
        console.error('⚠️ Failed to parse saved draft', e);
      }
    }
  }, []);

  // Debounced save using refs
  const debouncedSave = useDebouncedCallback(() => {
    const currentName = nameRef.current.trim();
    const currentContent = contentRef.current.trim();

    if (currentName || currentContent) {
      const draft = JSON.stringify({
        name: currentName,
        content: currentContent,
      });
      localStorage.setItem(DRAFT_KEY, draft);
      console.log('💾 Auto-saved draft:', {
        name: currentName,
        content: currentContent,
      });
    }
  }, 1000); // No dependency array

  useEffect(() => {
    debouncedSave();
  }, [name, content, debouncedSave]); // Still need to trigger on input changes

  const handleSubmit = async () => {
    const currentName = nameRef.current.trim();
    const currentContent = contentRef.current.trim();
    if (loading || !currentName || !currentContent) return;

    await onCreate(currentName, currentContent);
    setName('');
    setContent('');
    inputRef.current?.focus();
    localStorage.removeItem(DRAFT_KEY);
  };

  return (
    <div className="col-span-full space-y-2 rounded-xl bg-gray-900 p-4 shadow-lg">
      <input
        ref={inputRef}
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
      />
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
