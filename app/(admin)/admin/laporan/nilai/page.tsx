// app/(admin)/admin/laporan/nilai/page.tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/laporan">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Kembali
        </Link>
      </Button>
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Laporan Daftar Nilai sedang disiapkan (Tahap 2: tabel data + export
          Excel &amp; PDF).
        </CardContent>
      </Card>
    </div>
  );
}
