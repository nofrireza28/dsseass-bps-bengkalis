import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7
  },
  callbacks: {
    async jwt({ token, user }) {
      // Saat login pertama, parameter `user` tersedia dari authorize()
      // Kita simpan ke token agar persist di JWT cookie
      if (user) {
        token.employeeId = user.employeeId ?? null;
        token.roles = user.roles ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      // Setiap request, copy data dari token ke session
      // Ini yang membuat session.user.roles dapat diakses
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.employeeId = token.employeeId ?? null;
        session.user.roles = token.roles ?? [];
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = nextUrl.pathname === "/login";
      const isOnRoot = nextUrl.pathname === "/";

      // Redirect ke dashboard sesuai role jika sudah login dan akses /login atau /
      if (isLoggedIn && (isOnLoginPage || isOnRoot)) {
        const userRoles = auth.user.roles ?? [];
        if (userRoles.includes("ADMIN")) {
          return Response.redirect(new URL("/admin/dashboard", nextUrl));
        }
        if (userRoles.includes("PIMPINAN")) {
          return Response.redirect(new URL("/pimpinan/dashboard", nextUrl));
        }
        if (userRoles.includes("PEGAWAI")) {
          return Response.redirect(new URL("/pegawai/dashboard", nextUrl));
        }
      }

      // Halaman publik yang boleh diakses tanpa login
      const publicPaths = ["/login"];
      if (publicPaths.includes(nextUrl.pathname)) return true;

      // Halaman lain wajib login
      if (!isLoggedIn) return false;

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
