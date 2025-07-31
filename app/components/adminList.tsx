'use client';

import { useState } from 'react';
import axios from 'axios';
import useSWR from 'swr';
import { UserRecord } from '../lib/schema/User';

export default function AdminUserList() {
  const { data, mutate, error, isLoading } = useSWR<UserRecord[]>(
    '/api/users',
    async () => {
      const res = await axios.get('/api/users');
      return res.data;
    },
  );

  const [saving, setSaving] = useState<string | null>(null);
  const [editedUsers, setEditedUsers] = useState<
    Record<string, Partial<UserRecord>>
  >({});

  const handleEdit = (
    id: string,
    key: keyof UserRecord,
    value: string | number,
  ) => {
    setEditedUsers((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }));
  };

  const updateUser = async (id: string) => {
    const updated = editedUsers[id];
    if (!updated) return;

    setSaving(id);

    try {
      await axios.patch(`/api/users/${id}`, {
        sender_id: updated.sender_id,
        quota: updated.quota,
        role: updated.role,
      });

      await mutate();
      setEditedUsers((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setSaving(null);
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-10 text-[var(--color-text)]">
        Loading...
      </div>
    );

  if (error)
    return (
      <div className="py-10 text-center text-red-500">Error loading users</div>
    );

  return (
    <div className="min-h-screen p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((user) => {
          const edits = editedUsers[user.id] || user;
          const initials = user.email.charAt(0).toUpperCase();

          return (
            <div
              key={user.id}
              className="rounded-2xl border p-6 shadow-sm"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              <div className="mb-4 flex items-center gap-4">
                <div
                  className="h-10 w-10 rounded-full text-center text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    lineHeight: '2.5rem',
                  }}
                >
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-semibold">{user.email}</div>
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm text-[var(--color-muted)]">
                  Sender ID
                </label>
                <input
                  type="text"
                  value={edits.sender_id ?? ''}
                  onChange={(e) =>
                    handleEdit(user.id, 'sender_id', e.target.value)
                  }
                  placeholder="e.g. ONFON"
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                  style={{
                    backgroundColor: 'var(--color-input-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm text-[var(--color-muted)]">
                  Quota Remaining
                </label>
                <input
                  type="number"
                  value={edits.quota ?? ''}
                  onChange={(e) =>
                    handleEdit(user.id, 'quota', Number(e.target.value))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                  style={{
                    backgroundColor: 'var(--color-input-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm text-[var(--color-muted)]">
                  Role
                </label>
                <select
                  value={edits.role ?? ''}
                  onChange={(e) => handleEdit(user.id, 'role', e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                  style={{
                    backgroundColor: 'var(--color-input-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                onClick={() => updateUser(user.id)}
                disabled={saving === user.id}
                className="w-full rounded-full px-4 py-2 text-sm font-medium transition"
                style={{
                  backgroundColor: 'var(--color-button)',
                  color: 'white',
                  opacity: saving === user.id ? 0.6 : 1,
                }}
              >
                {saving === user.id ? 'Saving...' : 'Save'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
