"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "./mobile-sidebar";
import type { SidebarRole } from "./menu-config";
import { logoutAction } from "@/app/(auth)/logout/action";
import Link from "next/link";

interface DashboardHeaderProps {
  userName: string;
  userEmail: string;
  roleLabel: string;
  userRoles: string[];
  currentRole: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  PIMPINAN: "Pimpinan",
  PEGAWAI: "Pegawai",
};

const DASHBOARD_URLS: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  PIMPINAN: "/pimpinan/dashboard",
  PEGAWAI: "/pegawai/dashboard",
};

export function DashboardHeader({
  userName,
  userEmail,
  roleLabel,
  userRoles,
  currentRole,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logoutAction();
        toast.success("Logout berhasil");
        router.push("/login");
        router.refresh();
      } catch {
        toast.error("Gagal logout. Coba lagi.");
      }
    });
  };

  const handleSwitchRole = (targetRole: string) => {
    const url = DASHBOARD_URLS[targetRole];
    if (url) {
      router.push(url);
      router.refresh();
    }
  };

  const initials = userName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hasMultipleRoles = userRoles.length > 1;

  const changePasswordUrl = `/${currentRole.toLowerCase()}/change-password`;

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-6">
      {/* Left: Page title placeholder (akan diisi context) */}
      <div className="flex-1">
        <MobileSidebar
          role={currentRole as SidebarRole}
          roleLabel={roleLabel}
        />
      </div>
      <div className="flex items-center gap-3">
        {/* Role Switcher - hanya muncul kalau user punya lebih dari 1 role */}
        {hasMultipleRoles && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <span className="text-xs text-muted-foreground">Tampilan:</span>
                <span className="font-medium">{roleLabel}</span>
                <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Beralih Sebagai
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userRoles.map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => handleSwitchRole(role)}
                  className="cursor-pointer"
                >
                  {role === currentRole ? (
                    <Check className="mr-2 h-4 w-4 text-bps-primary" />
                  ) : (
                    <span className="mr-2 w-4" />
                  )}
                  {ROLE_LABELS[role] ?? role}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Right: User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 h-auto py-2"
            >
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-xs text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-bps-primary text-white text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {userEmail}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              {/* <a href="/change-password" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Ubah Password
              </a> */}
              <Link href={changePasswordUrl} className="cursor-pointer">
                <User className="mr-2 h4 w-4" />
                Ubah Password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isPending}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isPending ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
