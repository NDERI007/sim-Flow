'use client';

import AdminUserList from '../components/adminList';

export default function AdminUsersPage() {
  return (
    <main
      className="min-h-screen p-8"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <h1 className="mb-6 text-2xl font-bold">User Management</h1>
      <AdminUserList />
    </main>
  );
}
