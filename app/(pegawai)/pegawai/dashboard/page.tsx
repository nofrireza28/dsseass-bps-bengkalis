import { PenilaianProgressCard } from "./penilaian-progress-card";
import { PenilaianStatsCards } from "./penilaian-stats-cards";

export default function PegawaiDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Pegawai</h1>
        <p className="text-muted-foreground mt-1">
          Selamat datang. Periksa daftar penilaian Anda di sini.
        </p>
      </div>
      <PenilaianStatsCards />
      <PenilaianProgressCard />
    </div>
  );
}
