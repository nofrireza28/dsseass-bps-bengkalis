"use server";

import { db } from "@/db";
import { users, employees, roles, userRoles } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/auth-helpers";

const createUserSchema = z.object({
  employeeId: z.uuid("Pilih pegawai terlebih dahulu"),
  email: z.email("Formate email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  roleIds: z.array(z.uuid()).min(1, "Pilih minimal 1 role"),
});

const updateRolesShcema = z.object({
  roleIds: z.array(z.uuid()).min(1, "Pilih minimal 1 role"),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
});

export type UserActionState = {
  success: boolean;
  error?: string;
  userId?: string;
  generatedPassword?: string;
};

/**
 * Generate random password (8 chars, mix of letters and digits)
 */
function generateRandomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Input tidak valid";

  const fieldLabels: Record<string, string> = {
    employeeId: "Pegawai",
    email: "Email",
    password: "Password",
    newPassword: "Password Baru",
    roleIds: "Role",
  };

  const fieldName = String(issue.path[0] ?? "");
  const label = fieldLabels[fieldName] || fieldName;
  return label ? `${label}: ${issue.message}` : issue.message;
}

/**
 * Create new user account linked to employee
 */
export async function createUserAction(
  formData: FormData,
): Promise<UserActionState> {
  await requireRole(["ADMIN"]);

  // Extract roleIds dari multiple checkboxes
  const roleIdsList = formData.getAll("roleIds").map((v) => String(v));

  const rawData = {
    employeeId: String(formData.get("employeeId") ?? ""),
    email: String(formData.get("email") ?? "")
      .toLowerCase()
      .trim(),
    password: String(formData.get("password") ?? ""),
    roleIds: roleIdsList,
  };

  const parsed = createUserSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  // Cek email unik
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });
  if (existingUser) {
    return {
      success: false,
      error: `Email ${parsed.data.email} sudah dipakai akun lain`,
    };
  }

  // Cek pegawai exists dan belum punya akun
  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, parsed.data.employeeId),
  });
  if (!employee) {
    return { success: false, error: "Pegawai tidak ditemukan" };
  }
  if (employee.userId) {
    return { success: false, error: "Pegawai ini sudah punya akun" };
  }

  // Validasi role IDs ada di DB
  const validRoles = await db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.id, parsed.data.roleIds));
  if (validRoles.length !== parsed.data.roleIds.length) {
    return { success: false, error: "Salah satu role tidak valid" };
  }

  try {
    // Hash Password
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    // Insert user
    const [newUser] = await db
      .insert(users)
      .values({
        email: parsed.data.email,
        passwordHash,
        isActive: true,
      })
      .returning({ id: users.id });

    // Link employee -> user
    await db
      .update(employees)
      .set({ userId: newUser.id, updatedAt: new Date() })
      .where(eq(employees.id, parsed.data.employeeId));

    // Insert user roles
    await db.insert(userRoles).values(
      parsed.data.roleIds.map((roleId) => ({
        userId: newUser.id,
        roleId,
      })),
    );

    revalidatePath("/admin/akun");
    return { success: true, userId: newUser.id };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { success: true, error: "Gagal membuat akun pengguna" };
  }
}

/**
 * Update roles assigned to user
 */
export async function updateUserRolesAction(
  userId: string,
  formData: FormData,
): Promise<UserActionState> {
  await requireRole(["ADMIN"]);

  const roleIdsList = formData.getAll("roleIds").map((v) => String(v));

  const parsed = updateRolesShcema.safeParse({ roleIds: roleIdsList });
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  // Cek user exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) {
    return { success: false, error: "User tidak ditemukan" };
  }

  // Validasi role IDs valid
  const validRoles = await db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.id, parsed.data.roleIds));
  if (validRoles.length !== parsed.data.roleIds.length) {
    return { success: false, error: "Salah satu role tidak valid" };
  }

  try {
    // Hapus semua role lama
    await db.delete(userRoles).where(eq(userRoles.userId, userId));

    // Insert role baru
    await db
      .insert(userRoles)
      .values(parsed.data.roleIds.map((roleId) => ({ userId, roleId })));

    revalidatePath("/admin/akun");
    revalidatePath(`/admin/akun/${userId}`);
    return { success: true, userId };
  } catch (error) {
    console.error("Failed to update user roles:", error);
    return { success: false, error: "Gagal memperbarui role" };
  }
}

/**
 * Reset password (admin generate atau set manual)
 */
export async function resetPasswordAction(
  userId: string,
  formData: FormData,
): Promise<UserActionState> {
  await requireRole(["ADMIN"]);

  const useGenerated = formData.get("useGenerated") === "true";
  let newPassword: string;

  if (useGenerated) {
    newPassword = generateRandomPassword();
  } else {
    newPassword = String(formData.get("newPassword") ?? "");
    const parsed = resetPasswordSchema.safeParse({ newPassword });
    if (!parsed.success) {
      return { success: false, error: formatZodError(parsed.error) };
    }
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath("/admin/akun");
    return {
      success: true,
      userId,
      generatedPassword: useGenerated ? newPassword : undefined,
    };
  } catch (error) {
    console.error("Failed to reset password:", error);
    return { success: false, error: "Gagal reset password" };
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserStatusAction(
  userId: string,
  newStatus: boolean,
): Promise<UserActionState> {
  await requireRole(["ADMIN"]);

  try {
    await db
      .update(users)
      .set({ isActive: newStatus, updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath("/admin/akun");
    return { success: true, userId };
  } catch (error) {
    console.error("Failed to toggle user status:", error);
    return { success: false, error: "Gagal mengubah status akun" };
  }
}
