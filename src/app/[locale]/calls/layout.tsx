"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Phone,
  Upload,
  List,
  ChevronDown,
} from "lucide-react";
import { ProjectProvider, useProject } from "@/lib/calls/project-context";
import type { Project } from "@/types/calls";

const PROJECTS: Project[] = [
  { id: "proj-1", name: "Sales Q1 2026", description: "Q1 outbound sales campaign", created_at: "2026-01-01T00:00:00Z" },
  { id: "proj-2", name: "Support Audit", description: "Customer support quality audit", created_at: "2026-02-01T00:00:00Z" },
  { id: "proj-3", name: "Onboarding Calls", description: "New customer onboarding", created_at: "2026-02-15T00:00:00Z" },
];

const NAV_ITEMS = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calls", label: "Calls", icon: List },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/operators", label: "Operators", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function ProjectSelector() {
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  return (
    <div className="relative">
      <select
        value={selectedProjectId || ""}
        onChange={(e) => setSelectedProjectId(e.target.value || null)}
        className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1.5 appearance-none cursor-pointer focus:border-blue-500 focus:outline-none"
      >
        <option value="">All Projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";
  const basePath = `/${locale}/calls`;

  return (
    <div className="min-h-screen bg-[#0a0e17] flex">
      <aside className="w-56 bg-[#0d1117] border-r border-gray-800/60 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
              <Phone size={14} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">CallIntel</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Intelligence Platform</p>
            </div>
          </div>
        </div>

        <div className="px-3 pt-3 pb-1">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">Project</label>
          <ProjectSelector />
        </div>

        <nav className="flex-1 p-2 space-y-0.5 mt-1">
          {NAV_ITEMS.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive = item.href === ""
              ? pathname === basePath || pathname === `${basePath}/`
              : pathname.startsWith(href);

            return (
              <Link
                key={item.href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600/15 text-blue-400 border-l-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800/60">
          <div className="text-[10px] text-gray-600 text-center">CallIntel v1.0</div>
        </div>
      </aside>

      <div className="flex-1 overflow-auto" id="calls-main" />
    </div>
  );
}

export default function CallsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";
  const basePath = `/${locale}/calls`;

  return (
    <ProjectProvider projects={PROJECTS}>
      <div className="min-h-screen bg-[#0a0e17] flex">
        <aside className="w-56 bg-[#0d1117] border-r border-gray-800/60 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-800/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
                <Phone size={14} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">CallIntel</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Intelligence Platform</p>
              </div>
            </div>
          </div>

          <div className="px-3 pt-3 pb-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">Project</label>
            <ProjectSelector />
          </div>

          <nav className="flex-1 p-2 space-y-0.5 mt-1">
            {NAV_ITEMS.map((item) => {
              const href = `${basePath}${item.href}`;
              const isActive = item.href === ""
                ? pathname === basePath || pathname === `${basePath}/`
                : pathname.startsWith(href);

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600/15 text-blue-400 border-l-2 border-blue-500"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  <item.icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-800/60">
            <div className="text-[10px] text-gray-600 text-center">CallIntel v1.0</div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ProjectProvider>
  );
}
