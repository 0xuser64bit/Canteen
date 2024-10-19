"use server";

import db from "@/db";

const getUserDataAction = async ({
  email,
  username,
}: {
  email: string;
  username: string;
}) => {
  const user = await db.user.findUnique({
    where: {
      email: email,
      name: username,
    },
  });
  return user;
};

export { getUserDataAction };
