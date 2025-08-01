'use client';

import LogOutAdmin from '../components/admin-comp/AdLogOut';
import AdminUserList from '../components/admin-comp/adminList';

export default function AdminUsersPage() {
  return (
    <main
      className="min-h-screen p-8"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <LogOutAdmin />
      </div>

      <AdminUserList />
    </main>
  );
}
