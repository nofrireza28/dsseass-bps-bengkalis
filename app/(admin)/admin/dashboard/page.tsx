import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Calculator, CheckCircle2 } from "lucide-react";
import { getAdminDashboardStats } from "@/lib/dashboard-helpers";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  OPEN: {
    label: "Berjalan",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  CLOSED: {
    label: "Ditutup",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  AWAITING_APPROVAL: {
    label: "Menunggu Pengesahan",
    cls: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  },
  FINALIZED: {
    label: "Disahkan",
    cls: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  },
};

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const cards = [
    {
      title: "Total Pegawai",
      value: stats.totalPegawai,
      sub: "Pegawai aktif",
      icon: Users,
    },
    {
      title: "Periode Aktif",
      value: stats.periodeAktif,
      sub: "Sedang berjalan",
      icon: Calendar,
    },
    {
      title: "Perlu Dihitung",
      value: stats.perluDihitung,
      sub: "Periode ditutup",
      icon: Calculator,
    },
    {
      title: "Menunggu Pengesahan",
      value: stats.menungguPengesahan,
      sub: "Menunggu pimpinan",
      icon: CheckCircle2,
    },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard Administrator
        </h1>
        <p className="text-muted-foreground mt-1">
          Selamat datang di sistem SPK Pemilihan Pegawai Terbaik BPS Bengkalis
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value}</div>
                <p className="text-xs text-muted-foreground">{c.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Periode Terkini</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentPeriods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada periode. Mulai dengan membuat periode baru.
            </p>
          ) : (
            <div className="divide-y">
              {stats.recentPeriods.map((p) => {
                const meta = STATUS_META[p.status] ?? {
                  label: p.status,
                  cls: "bg-muted text-muted-foreground",
                };
                return (
                  <Link
                    key={p.id}
                    href={`/admin/periode/${p.id}`}
                    className="-mx-2 flex items-center justify-between rounded px-2 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Diperbarui{" "}
                        {new Date(p.updatedAt).toLocaleDateString("id-ID", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
