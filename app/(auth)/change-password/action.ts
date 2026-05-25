"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password lama harus diisi"),
    newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password harus diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak sesuai dengan password baru",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Password baru harus berbeda dari password lama",
    path: ["newPassword"],
  });

export type ChangePasswordActionState = {
  success: boolean;
  error?: string;
};

export async function changePasswordAction(
  formData: FormData,
): Promise<ChangePasswordActionState> {
  // 1. Validasi session
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Sesi tidak valid. Silahkan login ulang." };
  }

  // 2. Validasi input
  const rawData = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = changePasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }

  // 3. Ambil user dari DB
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    return { success: false, error: "User tidak ditemukan" };
  }

  // 4. Verifikasi password lama
  const passwordValid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash,
  );

  if (!passwordValid) {
    return { success: false, error: "Password lama yang Anda masukan salah" };
  }

  // 5. Hash password baru
  const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);

  // 6. Update password di DB
  await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  return { success: true };
}
