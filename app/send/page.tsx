'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function SendSmsPage() {
  const toNumbersRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);

  const [quota, setQuota] = useState<number | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState('');

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate({ editor }) {
      editorRef.current = editor;
    },
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      userIdRef.current = user.id;

      const { data, error } = await supabase
        .from('users')
        .select('quota')
        .eq('id', user.id)
        .single();

      if (!error && data) setQuota(data.quota);
    };

    fetchUserInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');

    const message = editorRef.current?.getText() || '';
    const toRaw = toNumbersRef.current?.value || '';
    const recipients = toRaw
      .split(/[,\n]+/)
      .map((num) => num.trim())
      .filter(Boolean);

    const messageSegments = Math.ceil(message.length / 160) || 1;
    const totalSegments = recipients.length * messageSegments;

    if (quota !== null && totalSegments > quota) {
      setStatus('error');
      setError(
        `❌ Not enough quota. Need ${totalSegments}, but have ${quota}.`,
      );
      return;
    }

    try {
      await axios.post('/api/send-sms', {
        to_numbers: recipients,
        message,
      });

      setStatus('success');
      if (toNumbersRef.current) toNumbersRef.current.value = '';
      editor?.commands.setContent('');
    } catch (err: any) {
      setStatus('error');
      setError(err?.response?.data?.message || 'Failed to send message.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-fuchsia-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-xl bg-white p-8 shadow-md"
      >
        <h2 className="text-center text-2xl font-bold text-fuchsia-700">
          Send SMS
        </h2>

        <textarea
          ref={toNumbersRef}
          placeholder="Enter phone numbers (comma or newline separated)"
          className="w-full rounded bg-gray-100 px-3 py-2 outline-none"
          rows={3}
          required
        />

        <div className="rounded border bg-white p-2">
          <EditorContent editor={editor} />
        </div>

        {quota !== null && (
          <p className="text-sm text-gray-500">
            Available quota: <strong>{quota}</strong>
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded bg-fuchsia-700 py-2 text-white hover:bg-fuchsia-500"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Sending...' : 'Send SMS'}
        </button>

        {status === 'success' && (
          <p className="text-center text-green-600">✅ Message sent.</p>
        )}
        {status === 'error' && (
          <p className="text-center text-red-600">{error}</p>
        )}
      </form>
    </main>
  );
}
