"use server";

import db from "@/db";

interface updatesUserProfileProps {
  email: string;
  country?: string;
  countryCode?: string;
  state?: string;
  city?: string;
  bio?: string;
}

const updatesUserProfile = async ({
  email,
  country,
  countryCode,
  state,
  city,
  bio,
}: updatesUserProfileProps) => {
  await db.user.update({
    where: {
      email: email,
    },
    data: {
      country,
      countryCode,
      state,
      city,
      bio,
    },
  });
};

export { updatesUserProfile };
