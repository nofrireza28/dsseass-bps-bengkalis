import Link from "next/link";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { desc } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EmployeesTable } from "./employees-table";

export const dynamic = "force-dynamic"; // Pastikan data selalu fresh

export default async function PegawaiPage() {
  const employeesList = await db
    .select()
    .from(employees)
    .orderBy(desc(employees.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen Pegawai
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola data pegawai BPS Kabupaten Bengkalis
          </p>
        </div>
        <Button asChild className="bg-bps-primary hover:bg-bps-primary/90">
          <Link href="/admin/pegawai/new">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pegawai
          </Link>
        </Button>
      </div>

      <EmployeesTable employees={employeesList} />
    </div>
  );
}
