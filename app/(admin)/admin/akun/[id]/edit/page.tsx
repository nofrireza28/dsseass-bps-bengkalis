import { notFound } from "next/navigation";
import { db } from "@/db";
import { users, employees, roles, userRoles } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

import { EditUserRolesForm } from "./edit-user-roles-form";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;

  // Ambil user + employee info
  const userData = await db
    .select({
      userId: users.id,
      email: users.email,
      employeeName: employees.fullName,
      employeeNip: employees.nip,
    })
    .from(users)
    .leftJoin(employees, eq(employees.userId, users.id))
    .where(eq(users.id, id))
    .limit(1);

  if (userData.length === 0) {
    notFound();
  }

  // Ambil current roles user
  const currentRoles = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, id));

  const currentRoleIds = currentRoles.map((r) => r.roleId);

  // Ambil semua roles
  const allRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
    })
    .from(roles)
    .orderBy(asc(roles.name));

  return (
    <EditUserRolesForm
      userId={id}
      userInfo={userData[0]}
      allRoles={allRoles}
      currentRoleIds={currentRoleIds}
    />
  );
}
