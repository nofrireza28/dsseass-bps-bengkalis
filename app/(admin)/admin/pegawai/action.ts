"use server";

import { db } from "@/db";
import { employees, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
// import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";

const employeeSchema = z.object({
  nip: z
    .string()
    .min(1, "NIP harus diisi")
    .max(50, "NIP maksimal 50 karakter")
    .regex(/^\d+$/, "NIP harus berupa angka"),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter").max(255),
  position: z.string().max(255).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
  joinedAt: z.string().optional().or(z.literal("")),
  exitedAt: z.string().optional().or(z.literal("")),
});

export type EmployeeActionState = {
  success: boolean;
  error?: string;
  employeeId?: string;
};

/**
 * Create new employee
 */
export async function createEmployeeAction(
  formData: FormData,
): Promise<EmployeeActionState> {
  await requireRole(["ADMIN"]);

  const rawData = {
    nip: formData.get("nip") as string,
    fullName: formData.get("fullName") as string,
    position: (formData.get("position") as string) || "",
    status: formData.get("status") as "ACTIVE" | "INACTIVE" | "ON_LEAVE",
    joinedAt: (formData.get("joinedAt") as string) || "",
    exitedAt: (formData.get("exitedAt") as string) || "",
  };

  const parsed = employeeSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }

  // Cek NIP unik
  const existing = await db.query.employees.findFirst({
    where: eq(employees.nip, parsed.data.nip),
  });
  if (existing) {
    return {
      success: false,
      error: `NIP ${parsed.data.nip} sudah terdaftar`,
    };
  }

  try {
    const [created] = await db
      .insert(employees)
      .values({
        nip: parsed.data.nip,
        fullName: parsed.data.fullName,
        position: parsed.data.position || null,
        status: parsed.data.status,
        joinedAt: parsed.data.joinedAt || null,
        exitedAt: parsed.data.exitedAt || null,
      })
      .returning({ id: employees.id });

    revalidatePath("/admin/pegawai");
    return { success: true, employeeId: created.id };
  } catch (error) {
    console.error("Failed to create employee: ", error);
    return { success: false, error: "Gagal menyimpan data pegawai" };
  }
}

/**
 * Update existing employee
 */
export async function updateEmployeeAction(
  employeeId: string,
  formData: FormData,
): Promise<EmployeeActionState> {
  await requireRole(["ADMIN"]);

  const rawData = {
    nip: formData.get("nip") as string,
    fullName: formData.get("fullName") as string,
    position: (formData.get("position") as string) || "",
    status: formData.get("status") as "ACTIVE" | "INACTIVE" | "ON_LEAVE",
    joinedAt: (formData.get("joinedAt") as string) || "",
    exitedAt: (formData.get("exitedAt") as string) || "",
  };

  const parsed = employeeSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }

  // Cek NIP unik (kecuali milik record yang sedang di-edit)
  const existing = await db.query.employees.findFirst({
    where: eq(employees.nip, parsed.data.nip),
  });

  if (existing && existing.id !== employeeId) {
    return {
      success: false,
      error: `NIP ${parsed.data.nip} sudah dipakai pegawai lain`,
    };
  }

  try {
    await db
      .update(employees)
      .set({
        nip: parsed.data.nip,
        fullName: parsed.data.fullName,
        position: parsed.data.position || "",
        status: parsed.data.status,
        joinedAt: parsed.data.joinedAt || null,
        exitedAt: parsed.data.exitedAt || null,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employeeId));

    revalidatePath("/admin/pegawai");
    revalidatePath(`/admin/pegawai/${employeeId}`);
    return { success: true, employeeId };
  } catch (error) {
    console.error("Failed to update employee:", error);
    return { success: false, error: "Gagal merperbarui data pegawai" };
  }
}

/**
 * Deactivate employee (soft delete via status change)
 */
export async function deactivateEmployeeAction(
  employeeId: string,
): Promise<EmployeeActionState> {
  await requireRole(["ADMIN"]);

  try {
    // Ambil employee untuk dapat user id
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, employeeId),
    });

    if (!employee) {
      return { success: false, error: "Pegawai tidak ditemukan" };
    }

    // Nonaktifkan employee
    await db
      .update(employees)
      .set({
        status: "INACTIVE",
        exitedAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employeeId));

    // Sinkronkan juga untuk nonaktifkan user terkait kalau ada
    if (employee.userId) {
      await db
        .update(users)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, employee.userId));
    }

    revalidatePath("/admin/pegawai");
    revalidatePath("/admin/akun");
    return { success: true, employeeId };
  } catch (error) {
    console.error("Failed to deacativate employee:", error);
    return { success: false, error: "Gagal menonaktifkan pegawai" };
  }
}

/**
 * Ractivate employee - tidak auto-reactivate akun
 * Admin harus aktifkan akun secara terpisah jika diperlukan
 */
export async function reactivateEmployeeAction(
  employeeId: string,
): Promise<EmployeeActionState> {
  await requireRole(["ADMIN"]);

  try {
    await db
      .update(employees)
      .set({
        status: "ACTIVE",
        exitedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employeeId));
    revalidatePath("/admin/pegawai");
    return { success: true, employeeId };
  } catch (error) {
    console.error("Failed to reactivate employee:", error);
    return { success: false, error: "Gagal mengaktifkan pegawai" };
  }
}
