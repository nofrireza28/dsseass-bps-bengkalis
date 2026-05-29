import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { authConfig } from "./auth.config";
import { db } from "./db";
import { users, employees, userRoles, roles } from "./db/schema";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        // Validasi input dengan Zod
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Query user dengan join ke employee dan roles
        const result = await db
          .select({
            userId: users.id,
            userEmail: users.email,
            passwordHash: users.passwordHash,
            isActive: users.isActive,
            employeeId: employees.id,
            fullName: employees.fullName,
            roleName: roles.name,
          })
          .from(users)
          .leftJoin(employees, eq(employees.userId, users.id))
          .leftJoin(userRoles, eq(userRoles.userId, users.id))
          .leftJoin(roles, eq(roles.id, userRoles.roleId))
          .where(eq(users.email, email));

        if (result.length === 0) return null;

        const userData = result[0];

        // Validasi akun aktif
        if (!userData.isActive) return null;

        // Validasi password
        const passwordValid = await bcrypt.compare(
          password,
          userData.passwordHash,
        );
        if (!passwordValid) return null;

        // Ambil data employee terkait
        const employee = await db.query.employees.findFirst({
          where: eq(employees.userId, userData.userId),
        });

        // Tolak login kalau pegawai terkait sudah INACTIVE
        if (employee && employee.status === "INACTIVE") {
          return null;
        }

        // Kumpulkan semua role (karena hasil join bisa multiple rows)
        const userRolesList = result
          .map((r) => r.roleName)
          .filter((name): name is string => name !== null);

        // Update last_login_at
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, userData.userId));

        return {
          id: userData.userId,
          email: userData.userEmail,
          name: userData.fullName ?? userData.userEmail,
          employeeId: userData.employeeId,
          roles: userRolesList,
        };
      },
    }),
  ],
});
