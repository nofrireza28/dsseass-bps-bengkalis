import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, Pencil, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DetailEmployeePageProps {
  params: Promise<{ id: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Aktif",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  INACTIVE: {
    label: "Nonaktif",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  ON_LEAVE: {
    label: "Cuti",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
};

export default async function DetailEmployeePage({
  params,
}: DetailEmployeePageProps) {
  const { id } = await params;

  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, id),
  });

  if (!employee) {
    notFound();
  }

  const statusConfig = STATUS_CONFIG[employee.status] ?? {
    label: employee.status,
    className: "",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/pegawai">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Detail Pegawai
            </h1>
            <p className="text-muted-foreground mt-1">
              Informasi lengkap data pegawai
            </p>
          </div>
        </div>
        <Button asChild className="bg-bps-primary hover:bg-bps-primary/90">
          <Link href={`/admin/pegawai/${employee.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-bps-primary/10">
              <UserIcon className="h-8 w-8 text-bps-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{employee.fullName}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                NIP: {employee.nip}
              </p>
              <div className="mt-2">
                <Badge className={statusConfig.className} variant="outline">
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Jabatan
              </dt>
              <dd className="mt-1 text-sm">
                {employee.position || (
                  <span className="text-muted-foreground italic">
                    Belum diisi
                  </span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Status
              </dt>
              <dd className="mt-1 text-sm">{statusConfig.label}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Tanggal Masuk
              </dt>
              <dd className="mt-1 text-sm">
                {employee.joinedAt
                  ? new Date(employee.joinedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Tanggal Keluar
              </dt>
              <dd className="mt-1 text-sm">
                {employee.exitedAt
                  ? new Date(employee.exitedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Dibuat pada
              </dt>
              <dd className="mt-1 text-sm">
                {new Date(employee.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Diperbarui pada
              </dt>
              <dd className="mt-1 text-sm">
                {new Date(employee.updatedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
