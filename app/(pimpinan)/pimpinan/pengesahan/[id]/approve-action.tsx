"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { approvePeriodAction } from "./action";

export function ApproveAction({ periodId }: { periodId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const res = await approvePeriodAction(periodId, notes);
      if (res.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pengesahan</CardTitle>
        <CardDescription>
          Sahkan hasil ranking ini sebagai keputusan final. Tindakan ini tidak
          dapat dibatalkan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setOpen(true)}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Sahkan Hasil
        </Button>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setOpen(false);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sahkan Hasil Ranking?</DialogTitle>
            <DialogDescription>
              Setelah disahkan, periode menjadi FINALIZED dan tidak dapat
              diubah. Lanjutkan?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan pengesahan (opsional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: Disetujui sesuai hasil rapat pimpinan."
              disabled={isPending}
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button onClick={handleApprove} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Sahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
