import { db } from "@/db";
import { employees, roles } from "@/db/schema";
import { asc, isNull } from "drizzle-orm";

import { CreateUserForm } from "./create-user-form";

export default async function NewUserPage() {
  // Ambil pegawai yang belum punya akun (userId IS NULL) dan masih aktif
  const availableEmployees = await db
    .select({
      id: employees.id,
      nip: employees.nip,
      fullName: employees.fullName,
      position: employees.position,
    })
    .from(employees)
    .where(isNull(employees.userId))
    .orderBy(asc(employees.fullName));

  // Ambil semua roles
  const allRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
    })
    .from(roles)
    .orderBy(asc(roles.name));

  return <CreateUserForm employees={availableEmployees} roles={allRoles} />;
}
