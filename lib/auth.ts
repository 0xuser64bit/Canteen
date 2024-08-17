import db from "@/db";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getUserWithEmail } from "./utils";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        name: {
          label: "Name",
          type: "text",
        },
        email: {
          label: "Email",
          type: "email",
        },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials: any) => {
        const email = credentials.email as string;
        const password = credentials.password as string;

        const existingUser = await getUserWithEmail({ email });
        const isMatch = await bcrypt.compare(
          password,
          existingUser?.password as string,
        );
        if (existingUser && isMatch) {
          return existingUser;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    // @ts-ignore
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        return true;
      }
      if (account?.provider !== "google") {
        return null;
      }
      const existingUser = await getUserWithEmail({
        email: user?.email as string,
      });
      if (existingUser) {
        return true;
      }
      await db.user.create({
        data: {
          name: user.name,
          email: user.email,
          image: user.image,
        },
      });
      return true;
    },
  },
});
