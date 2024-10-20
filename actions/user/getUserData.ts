"use server";

import db from "@/db";

const checkIfUserExits = async ({ email }: { email: string }) => {
  const user = await db.user.findUnique({
    where: {
      email: email,
    },
  });
  return user;
};

export { checkIfUserExits };
