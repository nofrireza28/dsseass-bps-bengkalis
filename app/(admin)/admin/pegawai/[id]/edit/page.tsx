import { notFound } from "next/navigation";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";

import { EmployeeForm } from "../../employee-form";

interface EditEmployeePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({
  params,
}: EditEmployeePageProps) {
  const { id } = await params;

  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, id),
  });

  if (!employee) {
    notFound();
  }

  return <EmployeeForm mode="edit" employee={employee} />;
}
