import Link from "next/link";
import { db } from "@/db";
import { users, employees, roles as rolesTable, userRoles } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function AkunPage() {
  // Ambil semua user dengan info employee dan roles
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      employeeId: employees.id,
      employeeName: employees.fullName,
      employeeNip: employees.nip,
    })
    .from(users)
    .leftJoin(employees, eq(employees.userId, users.id))
    .orderBy(desc(users.createdAt));

  // Ambil roles untuk setiap user (separate query agar tidak ribet join)
  const userRolesData = await db
    .select({
      userId: userRoles.userId,
      roleName: rolesTable.name,
    })
    .from(userRoles)
    .innerJoin(rolesTable, eq(rolesTable.id, userRoles.roleId));

  // Group roles per user
  const rolesByUserId = userRolesData.reduce(
    (acc, curr) => {
      if (!acc[curr.userId]) acc[curr.userId] = [];
      acc[curr.userId].push(curr.roleName);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  // Combine
  const usersWithRoles = allUsers.map((u) => ({
    ...u,
    roles: rolesByUserId[u.id] ?? [],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Akun</h1>
          <p className="text-muted-foreground">
            Kelola akun login pengguna sistem
          </p>
        </div>
        <Button asChild className="bg-bps-primary hover:bg-bps-primary/90">
          <Link href="/admin/akun/new">
            <Plus className="mr-2 h-4 w-4" />
            Buat Akun Baru
          </Link>
        </Button>
      </div>
      <UsersTable users={usersWithRoles} />
    </div>
  );
}
