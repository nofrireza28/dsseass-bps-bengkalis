import { requireAuth } from "@/lib/auth-helpers";
import { Sidebar, type SidebarRole } from "@/components/shared/sidebar";
import { DashboardHeader } from "@/components/shared/dashboard-header";

export default async function ChangePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const userRoles = session.user.roles ?? [];

  // Tentukan role utama untuk sidebar (prioritas: ADMIN > PIMPINAN > PEGAWAI)
  let role: SidebarRole = "PEGAWAI";
  let roleLabel = "Pegawai";

  if (userRoles.includes("ADMIN")) {
    role = "ADMIN";
    roleLabel = "Administrator";
  } else if (userRoles.includes("PIMPINAN")) {
    role = "PIMPINAN";
    roleLabel = "Pimpinan";
  }

  return (
    <div className="flex h-screen bg-muted/20">
      <Sidebar role={role} roleLabel={roleLabel} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          userName={session.user.name ?? "User"}
          userEmail={session.user.email ?? ""}
          roleLabel={roleLabel}
          userRoles={userRoles}
          currentRole={role}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
