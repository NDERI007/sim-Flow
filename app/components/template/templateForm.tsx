'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDebouncedCallback } from 'use-debounce';
import { Template, templateSchema } from '../../lib/schema/template';

const DRAFT_KEY = 'template-draft';

type Props = {
  onCreate: (name: string, content: string) => Promise<void>;
  loading: boolean;
};

export default function TemplateForm({ onCreate, loading }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<Template>({
    resolver: zodResolver(templateSchema),
    defaultValues: { label: '', content: '' },
  });

  const label = watch('label');
  const content = watch('content');

  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.label) setValue('label', draft.label);
        if (draft.content) setValue('content', draft.content);
      } catch (e) {
        console.error('Failed to parse saved draft', e);
      }
    }
  }, [setValue]);

  // Debounced save to localStorage
  const debouncedSave = useDebouncedCallback(() => {
    const trimmed = {
      label: label?.trim() || '',
      content: content?.trim() || '',
    };

    if (trimmed.label || trimmed.content) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(trimmed));
      console.log('Auto-saved draft:', trimmed);
    }
  }, 1000);

  useEffect(() => {
    debouncedSave();
  }, [label, content, debouncedSave]);

  const onSubmit = async (data: Template) => {
    if (loading) return;
    await onCreate(data.label.trim(), data.content.trim());
    reset(); // clears the form
    localStorage.removeItem(DRAFT_KEY);
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="col-span-full space-y-2 rounded-xl bg-gray-900 p-4 shadow-lg"
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Template Label"
        {...register('label')}
        className="w-full rounded bg-gray-800 p-2 text-white placeholder-gray-400 outline-none"
      />
      {errors.label && (
        <p className="text-sm text-red-400">{errors.label.message}</p>
      )}

      <textarea
        placeholder="Message Content"
        {...register('content')}
        className="w-full rounded bg-gray-800 p-2 text-white placeholder-gray-400 outline-none"
      />
      {errors.content && (
        <p className="text-sm text-red-400">{errors.content.message}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-pink-900 px-4 py-2 text-white hover:bg-pink-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Add Template'}
      </button>
    </form>
  );
}
