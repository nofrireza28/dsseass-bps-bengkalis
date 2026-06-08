import Link from "next/link";
import { ArrowRight, Trophy, Calendar } from "lucide-react";
import { getFinalizedPeriods } from "@/lib/ranking-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HasilPage() {
  const periods = await getFinalizedPeriods();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengumuman Hasil Pegawai Terbaik</h1>
        <p className="text-sm text-muted-foreground">
          Hasil resmi periode penilaian yang telah disahkan.
        </p>
      </div>

      {periods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada hasil yang dipublikasikan.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {periods.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  {p.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Disahkan{" "}
                  {p.finalizedAt
                    ? new Date(p.finalizedAt).toLocaleDateString("id-ID", {
                        dateStyle: "long",
                      })
                    : "-"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={`/hasil/${p.id}`}>
                    Lihat Pemenang
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
