"use server";

import db from "@/db";

export const getUniversityofAllCurrentUsers = async () => {
  const universities = await db.user.findMany({
    select: {
      university: true,
    },
  });
  return findUniqueUniversity(universities);
};

const findUniqueUniversity = (universities: any[]) => {
  let seen: { [key: string]: boolean } = {};
  universities
    .filter((university) => university.university)
    .map((university) => {
      if (!seen.hasOwnProperty(university.university)) {
        seen[university.university] = true;
      }
    });
  return Object.keys(seen);
};
