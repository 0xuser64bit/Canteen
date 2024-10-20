"use server";

import db from "@/db";
import { signIn } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

const credentialsSignUp = async ({
  email,
  password,
  universityName,
  country,
  countryCode,
}: {
  email: string;
  password: string;
  universityName: string;
  country: string;
  countryCode: string;
}) => {
  const user = await db.user.findFirst({
    where: {
      email,
    },
  });
  if (user) {
    return {
      message: "User Alraedy Exists",
      status: 409,
    };
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.user.create({
    data: {
      email,
      password: hashedPassword,
      university: universityName,
      country: country,
      countryCode: countryCode,
      emailVerified: false, //Todo: send email on this email id get back 6 digit code and then let user sign in
    },
  });
  try {
    await signIn("credentials", {
      email,
      password,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { message: "Invalid credentials!" };
        default:
          return { message: "Something went wrong!" };
      }
    }

    throw error;
  }
};

export { credentialsSignUp };
