import { requireRole } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/shared/sidebar";
import { DashboardHeader } from "@/components/shared/dashboard-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["ADMIN"]);

  return (
    <div className="flex h-screen bg-muted/20">
      <Sidebar role="ADMIN" roleLabel="Administrator" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          userName={session.user.name ?? "Admin"}
          userEmail={session.user.email ?? ""}
          roleLabel="Administrator"
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
