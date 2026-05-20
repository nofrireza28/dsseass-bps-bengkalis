import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      employeeId: string | null;
      roles: string[];
    } & DefaultSession["user"];
  }

  interface User {
    employeeId?: string | null;
    roles?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    employeeId?: string | null;
    roles?: string[];
  }
}