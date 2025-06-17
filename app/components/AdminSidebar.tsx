"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/admin" },
    { label: "Messages", href: "/admin/messages" },
    { label: "Users", href: "/admin/users" },
    { label: "Settings", href: "/admin/settings" },
  ];

  return (
    <aside className="w-64 bg-fuchsia-400 text-white p-6 flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
        <nav className="space-y-3">
          {navItems.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-lg ${
                pathname === href
                  ? "bg-fuchsia-600 font-semibold"
                  : "hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <form method="post" action="/api/auth/signout">
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </form>
    </aside>
  );
}
