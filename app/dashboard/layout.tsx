import Sidebar from '../components/Sidebar';
import { PromptBanner } from '../components/MFA-comp/PromptMFA';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-gray-900 text-gray-100 md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 md:ml-64">
        <PromptBanner />
        {children}
      </main>
    </div>
  );
}
