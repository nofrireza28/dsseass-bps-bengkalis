import { HasilDetail } from "@/components/shared/hasil-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HasilDetail periodId={id} backPath="/pimpinan/hasil" />;
}
