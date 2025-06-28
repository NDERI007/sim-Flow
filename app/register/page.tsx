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
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full rounded bg-gray-100 px-3 py-2"
      />
      <input
        type="email"
        placeholder="Your Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded bg-gray-100 px-3 py-2"
      />
      <button
        type="submit"
        className="w-full rounded bg-fuchsia-700 py-2 text-white hover:bg-fuchsia-600"
      >
        Submit
      </button>
      {status && <p className="text-sm text-gray-600">{status}</p>}
    </form>
  );
}
