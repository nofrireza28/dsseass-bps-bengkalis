import { requireAuth } from "@/lib/auth-helpers";
import { Sidebar, type SidebarRole } from "@/components/shared/sidebar";
import { DashboardHeader } from "@/components/shared/dashboard-header";

const ROLE_LABEL: Record<SidebarRole, string> = {
  ADMIN: "Administrator",
  PIMPINAN: "Pimpinan",
  PEGAWAI: "Pegawai",
};

export default async function HasilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const roles = session.user.roles ?? [];
  const primaryRole: SidebarRole = roles.includes("ADMIN")
    ? "ADMIN"
    : roles.includes("PIMPINAN")
      ? "PIMPINAN"
      : "PEGAWAI";

  return (
    <div className="flex h-screen bg-muted/20">
      <Sidebar role={primaryRole} roleLabel={ROLE_LABEL[primaryRole]} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          userName={session.user.name ?? "Pengguna"}
          userEmail={session.user.email ?? ""}
          roleLabel={ROLE_LABEL[primaryRole]}
          userRoles={roles}
          currentRole={primaryRole}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
