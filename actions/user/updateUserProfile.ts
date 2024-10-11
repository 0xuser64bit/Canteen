"use server";

import db from "@/db";

interface updatesUserProfileProps {
  email: string;
  username: string;
  university: string;
  country?: string;
  state?: string;
  city?: string;
  bio?: string;
}

const updatesUserProfile = async ({
  email,
  username,
  university,
  country,
  state,
  city,
  bio,
}: updatesUserProfileProps) => {
  await db.user.update({
    where: {
      email: email,
    },
    data: {
      name: username,
      university,
      country,
      state,
      city,
      bio,
    },
  });
};

export { updatesUserProfile };
