import type { Role } from "@prisma/client";
import type { DefaultSession, DefaultUser } from "next-auth";

interface CustomAuthUser extends DefaultUser {
  role?: Role | string;
}

declare module "next-auth" {
  interface User extends CustomAuthUser {}

  interface Session {
    user: DefaultSession["user"] & { role?: Role | string };
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser extends CustomAuthUser {}
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role | string;
  }
}
