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
      name: "Credentials",
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
      // @ts-ignore
      authorize: async (
        credentials: Partial<Record<"email" | "password", unknown>>,
      ) => {
        const email = credentials.email as string;
        const password = credentials.password as string;

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await db.user.findFirst({
          where: {
            email,
          },
          select: {
            password: true,
          },
        });
        if (!user) {
          throw new Error("User not found");
        }

        const isMatch = bcrypt.compare(password, user?.password as string);
        if (!isMatch) {
          throw new Error("Wrong Credentials");
        }
        return user;
      },
    }),
    // ...add more providers here
  ],
});
