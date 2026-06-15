// app/(pimpinan)/pimpinan/laporan/nilai/page.tsx
import { LaporanNilai } from "@/components/shared/laporan-nilai";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string }>;
}) {
  const { periodId } = await searchParams;
  return <LaporanNilai basePath="/pimpinan/laporan" periodId={periodId} />;
}
