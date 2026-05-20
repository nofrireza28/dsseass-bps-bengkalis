import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
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
