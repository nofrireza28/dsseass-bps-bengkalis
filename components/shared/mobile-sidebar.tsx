"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MENU_BY_ROLE,
  DASHBOARD_BY_ROLE,
  type SidebarRole,
} from "./menu-config";

interface Props {
  role: SidebarRole;
  roleLabel: string;
}

export function MobileSidebar({ role, roleLabel }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuItems = MENU_BY_ROLE[role];
  const dashboardUrl = DASHBOARD_BY_ROLE[role];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Buka menu navigasi</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 border-0 bg-bps-primary p-0 text-white"
      >
        <SheetHeader className="border-b border-white/10 p-6 text-left">
          <Link
            href={dashboardUrl}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3"
          >
            <Image
              src="/logos/bps-logo.png"
              alt="Logo BPS"
              width={40}
              height={40}
              style={{ width: "auto", height: "40px" }}
              className="object-contain"
            />
            <div>
              <SheetTitle className="text-sm font-bold leading-tight text-white">
                SPK Pegawai
              </SheetTitle>
              <p className="text-xs leading-tight text-blue-200">
                BPS Bengkalis
              </p>
            </div>
          </Link>
        </SheetHeader>

        <div className="border-b border-white/10 px-4 py-3">
          <div className="mb-1 text-xs text-blue-200">Login sebagai</div>
          <div className="text-sm font-semibold text-bps-accent">
            {roleLabel}
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
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
      </SheetContent>
    </Sheet>
  );
}
