import {
  LayoutDashboard,
  Users,
  KeyRound,
  Sliders,
  Calendar,
  ClipboardList,
  CheckCircle2,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export type SidebarRole = "PEGAWAI" | "ADMIN" | "PIMPINAN";

export const MENU_BY_ROLE: Record<SidebarRole, MenuItem[]> = {
  PEGAWAI: [
    { label: "Dashboard", href: "/pegawai/dashboard", icon: LayoutDashboard },
    { label: "Penilaian", href: "/pegawai/penilaian", icon: ClipboardList },
    { label: "Pengumuman Hasil", href: "/hasil", icon: Trophy },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Pegawai", href: "/admin/pegawai", icon: Users },
    { label: "Akun Pengguna", href: "/admin/akun", icon: KeyRound },
    { label: "Kriteria", href: "/admin/kriteria", icon: Sliders },
    { label: "Periode", href: "/admin/periode", icon: Calendar },
    { label: "Pengumuman Hasil", href: "/hasil", icon: Trophy },
  ],
  PIMPINAN: [
    { label: "Dashboard", href: "/pimpinan/dashboard", icon: LayoutDashboard },
    { label: "Pengesahan", href: "/pimpinan/pengesahan", icon: CheckCircle2 },
    { label: "Pengumuman Hasil", href: "/hasil", icon: Trophy },
  ],
};

export const DASHBOARD_BY_ROLE: Record<SidebarRole, string> = {
  PEGAWAI: "/pegawai/dashboard",
  ADMIN: "/admin/dashboard",
  PIMPINAN: "/pimpinan/dashboard",
};
