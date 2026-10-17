import type { Metadata } from "next";
import Link from "next/link";
import { UniversityRequestForm } from "@/components/university-request";
export const metadata: Metadata = { title: "Request a university domain" };
export default function UniversityRequestPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-5 py-10">
      <Link href="/join" className="text-[13px] font-semibold underline">
        Back to sign-in
      </Link>
      <h1 className="text-[30px] font-display">University missing?</h1>
      <p className="text-[15px] leading-relaxed text-muted">
        Ask the team to check the email domain against your university’s
        official information. Requests are visible only to the team.
        Verification still requires control of an eligible university email
        address.
      </p>
      <UniversityRequestForm />
    </main>
  );
}
