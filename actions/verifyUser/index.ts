"use server";

import db from "@/db";

export const verifyUser = async ({ email }: { email: string }) => {
  const domain = email.split("@")[1];
  const verify = await db.domain.findFirst({
    where: {
      domainName: domain,
    },
  });
  if (verify) {
    return true;
  }
  return false;
};
