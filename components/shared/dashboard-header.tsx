"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
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

import { logoutAction } from "@/app/(auth)/logout/action";

interface DashboardHeaderProps {
  userName: string;
  userEmail: string;
  roleLabel: string;
}

export function DashboardHeader({
  userName,
  userEmail,
  roleLabel,
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

  const initials = userName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-6">
      {/* Left: Page title placeholder (akan diisi context) */}
      <div className="flex-1">
        {/* Sidebar mobile trigger akan ditambahkan di sini nanti */}
      </div>

      {/* Right: User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-3 h-auto py-2"
          >
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground">{roleLabel}</span>
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
            <a href="/change-password" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Ubah Password
            </a>
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
    </header>
  );
}
