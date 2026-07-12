import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isDemo: boolean;
    } & DefaultSession["user"];
  }
}
