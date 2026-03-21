"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Users,
  LogOut,
  Send,
  Zap,
  BarChart3,
  AlertCircle,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "CRM",
    items: [
      { href: "", label: "Dashboard", icon: LayoutDashboard },
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/pipeline", label: "Pipeline", icon: Kanban },
    ],
  },
  {
    label: "Outreach",
    items: [
      { href: "/outreach", label: "Outreach", icon: Send },
      { href: "/sequences", label: "Sekvence", icon: Zap },
      { href: "/import", label: "Import", icon: BarChart3 },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { href: "/email-health", label: "Email Health", icon: AlertCircle },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Extract locale from pathname (e.g., /en/admin/...)
  const locale = pathname.split("/")[1] || "en";
  const basePath = `/${locale}/admin`;

  // Don't wrap login page with admin chrome
  if (pathname.endsWith("/login")) {
    return <>{children}</>;
  }

  function handleLogout() {
    document.cookie = "admin_token=; path=/; max-age=0";
    window.location.href = `/${locale}/admin/login`;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold text-white">Webflip Admin</h1>
          <p className="text-xs text-gray-500 mt-0.5">CRM Dashboard</p>
        </div>

        <nav className="flex-1 p-2 space-y-6 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const href = `${basePath}${item.href}`;
                  const isActive = item.href === ""
                    ? pathname === basePath || pathname === `${basePath}/`
                    : pathname.startsWith(href);

                  return (
                    <Link
                      key={item.href}
                      href={href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-blue-600/20 text-blue-400"
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 w-full transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
