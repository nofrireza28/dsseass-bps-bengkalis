import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Pastikan user terautentikasi. Redirect ke /login jika tidak.
 * Pakai di server component yang butuh user login
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Pastikan user punya salah satu role yang diizinkan.
 * Redirect ke /forbidden jika role tidak match.
 */
export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();
  const userRoles = session.user.roles ?? [];

  const hasPermission = userRoles.some((role) => allowedRoles.includes(role));

  if (!hasPermission) {
    redirect("/forbidden");
  }

  return session;
}

/**
 * Cek apakah user punya role tertentu (untuk kondisi UI).
 * Tidak redirect, hanya return boolean
 */
export function hasRole(roles: string[] | undefined, role: string) {
  return roles?.includes(role) ?? false;
}
