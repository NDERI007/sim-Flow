'use client';

import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

export default function EmailSubmissionForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      await axios.post('/api/register/setup', { email, name });
      setStatus('success');
      toast.success('Request submitted successfully!');
    } catch (err) {
      let message = 'Something went wrong.';

      if (err instanceof AxiosError) {
        message = err.response?.data?.error || err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setStatus('error');
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 bg-gray-900 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-xl bg-gray-800 p-6 shadow-lg"
      >
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-300">Get Started</h1>
          <p className="mt-1 text-sm text-gray-400">
            Enter your details to begin the registration process.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-300"
          >
            Username
          </label>
          <input
            id="name"
            type="text"
            placeholder="Voke"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md bg-gray-700 px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-300"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md bg-gray-700 px-4 py-2 text-sm text-gray-800 text-white placeholder-gray-400 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-md bg-pink-900 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-pink-800 focus:ring-2 focus:ring-pink-900 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none disabled:opacity-50"
        >
          {status === 'submitting' ? 'Submitting...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
