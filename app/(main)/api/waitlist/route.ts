import { NextRequest, NextResponse } from "next/server";
import db from "@/db";

export async function POST(req: NextRequest) {
  const { email }: { email: string } = await req.json();

  const check = await db.waitlist.findFirst({
    where: { email },
  });
  if (check) {
    return new NextResponse("Email already exists", { status: 409 });
  }
  await db.waitlist.create({
    data: {
      email,
    },
  });
  return new NextResponse("Done", { status: 200 });
}
