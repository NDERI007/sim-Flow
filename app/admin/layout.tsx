import AdminSidebar from "../components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
