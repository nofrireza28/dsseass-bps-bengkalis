import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Trophy, Calendar, ArrowRight } from "lucide-react";
import { getPimpinanDashboardStats } from "@/lib/dashboard-helpers";

export default async function PimpinanDashboardPage() {
  const stats = await getPimpinanDashboardStats();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard Pimpinan
        </h1>
        <p className="text-muted-foreground mt-1">
          Selamat datang. Tinjau hasil ranking dan lakukan pengesahan di sini.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Menunggu Pengesahan
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.awaitingApproval}</div>
            <p className="text-xs text-muted-foreground">
              Periode menunggu disahkan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Disahkan
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.finalized}</div>
            <p className="text-xs text-muted-foreground">Periode selesai</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Periode Aktif</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground">Sedang berlangsung</p>
          </CardContent>
        </Card>
      </div>

      {/* CTA bila ada yang menunggu */}
      {stats.awaitingApproval > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              Ada{" "}
              <span className="font-semibold">{stats.awaitingApproval}</span>{" "}
              periode yang menunggu pengesahan Anda.
            </p>
            <Button asChild size="sm">
              <Link href="/pimpinan/pengesahan">
                Tinjau Sekarang
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
