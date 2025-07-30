'use client';

import { useState } from 'react';
import axios, { AxiosError } from 'axios';

export default function EmailSubmissionForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setMessage('');

    try {
      await axios.post('/api/register/setup', { email, name });
      setStatus('success');
      setMessage('Request submitted successfully!');
    } catch (err) {
      let message = 'Something went wrong.';

      if (err instanceof AxiosError) {
        message = err.response?.data?.error || err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setStatus('error');
      setMessage(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800"
      >
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            Get Started
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter your details to begin the registration process.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
            className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-800 focus:border-pink-900 focus:ring-1 focus:ring-pink-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
            className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-800 focus:border-pink-900 focus:ring-1 focus:ring-pink-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-md bg-pink-900 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-pink-800 focus:ring-2 focus:ring-pink-900 focus:ring-offset-2 focus:outline-none disabled:opacity-50 dark:focus:ring-offset-gray-900"
        >
          {status === 'submitting' ? 'Submitting...' : 'Continue'}
        </button>

        {message && (
          <p
            className={`text-center text-sm ${
              status === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500 dark:text-red-400'
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
