import AdminSidebar from '../components/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 md:flex">
      <AdminSidebar />
      <main className="flex-1 p-6 md:ml-64">{children}</main>
    </div>
  );
}
