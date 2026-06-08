import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { getPeriodsAwaitingApproval } from "@/lib/ranking-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PengesahanPage() {
  const periods = await getPeriodsAwaitingApproval();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengesahan Hasil</h1>
        <p className="text-sm text-muted-foreground">
          Periode yang menunggu pengesahan Anda.
        </p>
      </div>

      {periods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Tidak ada periode yang menunggu pengesahan saat ini.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {periods.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base">{p.name}</CardTitle>
                <CardDescription className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Diajukan{" "}
                  {p.awaitingApprovalAt
                    ? new Date(p.awaitingApprovalAt).toLocaleString("id-ID")
                    : "-"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={`/pimpinan/pengesahan/${p.id}`}>
                    Tinjau &amp; Sahkan
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
