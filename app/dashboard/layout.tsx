import UserSidebar from '../components/UserSidebar';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      <UserSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
