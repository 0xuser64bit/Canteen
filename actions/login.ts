"use server";

import db from "@/db";
import { signIn } from "@/auth";

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
      status: 404,
    };
  }
  try {
    await signIn("credentials", {
      email,
      password,
    });
  } catch (e) {
    return {
      message: "Could not sign in " + e,
      status: 404,
    };
  }
};

export { credentialsLogin };
