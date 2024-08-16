"use server";

import db from "@/db";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";

const credentialsLogin = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const user = await db.user.findFirst({
    where: {
      email,
    },
    select: {
      password: true,
    },
  });
  if (!user) {
    return {
      message: "User doesn't Exists",
    };
  }
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

const login = async (provider: string) => {
  await signIn(provider, { redirectTo: "/community" });
  revalidatePath("/community");
};
export { credentialsLogin, login };
