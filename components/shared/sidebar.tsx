"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { MENU_BY_ROLE, DASHBOARD_BY_ROLE } from "./menu-config";
import type { SidebarRole } from "./menu-config";

export type { SidebarRole }; // re-export agar import lama tetap bekerja

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

      <div className="px-4 py-3 border-b border-white/10">
        <div className="text-xs text-blue-200 mb-1">Login sebagai</div>
        <div className="text-sm font-semibold text-bps-accent">{roleLabel}</div>
      </div>

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

      <div className="p-4 border-t border-white/10 text-xs text-blue-200/70">
        © {new Date().getFullYear()} BPS Bengkalis
      </div>
    </aside>
  );
}
