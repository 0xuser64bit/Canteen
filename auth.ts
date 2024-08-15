import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import db from "@/db";
import bcrypt from "bcryptjs";

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

        const user = await db.user.findFirst({
          where: {
            email,
          },
          select: {
            password: true,
            id: true,
            name: true,
          },
        });
        const isMatch = await bcrypt.compare(
          password,
          user?.password as string,
        );
        if (user && isMatch) {
          return user;
        }
        return null;
      },
    }),
    // ...add more providers here
  ],
});
