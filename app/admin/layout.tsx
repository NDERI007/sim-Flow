import AdminSidebar from '../components/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-900 text-gray-100 md:flex-row">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6 md:ml-64">{children}</main>
    </div>
  );
}
