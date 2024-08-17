import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import db from "@/db";
import { Prisma } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUserWithEmail({
  email,
}: {
  email: string;
}): Prisma.Prisma__UserClient<
  {
    id: string;
    name: string | null;
    email: string | null;
    password: string | null;
  } | null,
  null,
  DefaultArgs
> | null {
  const user = db.user.findFirst({
    where: {
      email,
    },
    select: {
      password: true,
      id: true,
      name: true,
      email: true,
    },
  });
  if (!user) {
    return null;
  }
  return user;
}
