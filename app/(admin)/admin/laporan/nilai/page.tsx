// app/(admin)/admin/laporan/nilai/page.tsx
import { LaporanNilai } from "@/components/shared/laporan-nilai";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string }>;
}) {
  const { periodId } = await searchParams;
  return <LaporanNilai basePath="/admin/laporan" periodId={periodId} />;
}
