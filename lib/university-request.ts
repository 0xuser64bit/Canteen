import { z } from "zod";

export const universityRequestInput = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
      "Enter the email domain only, such as university.edu.",
    ),
  website: z
    .string()
    .trim()
    .max(2048)
    .url("Enter the official university homepage.")
    .refine((value) => {
      if (!URL.canParse(value)) return false;
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname === "/"
      );
    }, "Use an HTTPS homepage without personal details, query parameters, or a login.")
    .transform((value) => new URL(value).origin),
});
