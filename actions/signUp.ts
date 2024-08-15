"use server";
import db from "@/db";
import bcrypt from "bcryptjs";

const credentialsSignUp = async ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
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
      name,
      email,
      password: hashedPassword,
    },
  });
};

export { credentialsSignUp };
