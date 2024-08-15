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
  });
  if (!user) {
    return {
      message: "User doesn't Exists",
      status: 404,
    };
  }
  await signIn("credentials", {
    email,
    password,
  });
};

export { credentialsLogin };
