"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(1, "Password harus diisi"),
});

export type LoginActionState = {
  success: boolean;
  error?: string;
};

export async function loginAction(
  formData: FormData,
): Promise<LoginActionState> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // Validasi input
  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            success: false,
            error: "Email atau password salah",
          };
        default:
          return {
            success: false,
            error: "Terjadi kesalahan saat login",
          };
      }
    }
    // Re-throw error not-auth (misal: error koneksi database)
    throw error;
  }
}
