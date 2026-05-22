"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Sliders,
  Calendar,
  ClipboardList,
  Calculator,
  CheckCircle2,
  FileText,
  Trophy,
  Eye,
  type LucideIcon,
} from "lucide-react";

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export type SidebarRole = "PEGAWAI" | "ADMIN" | "PIMPINAN";

const MENU_BY_ROLE: Record<SidebarRole, MenuItem[]> = {
  PEGAWAI: [
    { label: "Dashboard", href: "/pegawai/dashboard", icon: LayoutDashboard },
    { label: "Penilaian", href: "/pegawai/penilaian", icon: ClipboardList },
    { label: "Hasil Ranking", href: "/pegawai/ranking", icon: Trophy },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Pegawai", href: "/admin/pegawai", icon: Users },
    { label: "Kriteria", href: "/admin/kriteria", icon: Sliders },
    { label: "Periode", href: "/admin/periode", icon: Calendar },
    { label: "Perhitungan", href: "/admin/perhitungan", icon: Calculator },
    { label: "Audit Penilaian", href: "/admin/audit", icon: Eye },
    { label: "Laporan", href: "/admin/laporan", icon: FileText },
  ],
  PIMPINAN: [
    { label: "Dashboard", href: "/pimpinan/dashboard", icon: LayoutDashboard },
    { label: "Pengesahan", href: "/pimpinan/pengesahan", icon: CheckCircle2 },
    { label: "Hasil Ranking", href: "/pimpinan/ranking", icon: Trophy },
    { label: "Laporan", href: "/pimpinan/laporan", icon: FileText },
  ],
};

// Mapping URL dashboard per role
const DASHBOARD_BY_ROLE: Record<SidebarRole, string> = {
  PEGAWAI: "/pegawai/dashboard",
  ADMIN: "/admin/dashboard",
  PIMPINAN: "/pimpinan/dashboard",
};

interface SidebarProps {
  role: SidebarRole;
  roleLabel: string;
}

export function Sidebar({ role, roleLabel }: SidebarProps) {
  const pathname = usePathname();
  const menuItems = MENU_BY_ROLE[role];
  const dashboardUrl = DASHBOARD_BY_ROLE[role];

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-bps-primary text-white border-r border-blue-900/20">
      {/* Logo & Title */}
      <div className="p-6 border-b border-white/10">
        <Link
          href={dashboardUrl}
          className="flex items-center gap-3 group hover:opacity-90 transition-opacity"
        >
          <div className="bg-transparent p-1.5 shrink-0 group-hover:scale-105 transition-transform">
            <Image
              src="/logos/bps-logo.png"
              alt="Logo BPS"
              width={40}
              height={40}
              style={{ width: "auto", height: "40px" }}
              className="object-contain"
            />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">SPK Pegawai</p>
            <p className="text-xs text-blue-200 leading-tight">BPS Bengkalis</p>
          </div>
        </Link>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="text-xs text-blue-200 mb-1">Login sebagai</div>
        <div className="text-sm font-semibold text-bps-accent">{roleLabel}</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-white/15 text-white font-medium"
                  : "text-blue-100 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 text-xs text-blue-200/70">
        © {new Date().getFullYear()} BPS Bengkalis
      </div>
    </aside>
  );
}
