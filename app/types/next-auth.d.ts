// types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  type UserRole = "admin" | "user";

  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      role: UserRole;
      quota: number;
    };
  }

  interface User extends DefaultUser {
    id: string;
    email: string;
    role: UserRole;
    quota: number;
  }
}

declare module "next-auth/jwt" {
  type UserRole = "admin" | "user";

  interface JWT extends DefaultJWT {
    id: string;
    email: string;
    role: UserRole;
    quota: number;
  }
}
