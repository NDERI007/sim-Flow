'use client';

import { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../lib/AuthStore';

export default function EmailSubmissionForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const { accessToken } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Submitting...');

    try {
      await axios.post(
        '/api/request-registration',
        { email, name },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      setStatus('Request submitted successfully!');
    } catch (err: any) {
      setStatus(`Error: ${err.response?.data?.error || 'Unknown error'}`);
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
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="name"
          >
            Full Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-800 focus:border-pink-900 focus:ring-1 focus:ring-pink-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        <div className="space-y-2">
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="email"
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
          className="w-full rounded-md bg-pink-900 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-pink-800 focus:ring-2 focus:ring-pink-900 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-900"
        >
          Continue
        </button>

        {status && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
