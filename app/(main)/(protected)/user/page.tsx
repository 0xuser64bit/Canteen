import { redirect } from "next/navigation";

export default async function UserPage() {
  redirect("/user/profile");
  return (
    <>
      <h1>
        No Plans for this page right now. just redirecting to /user/profile
      </h1>
    </>
  );
}
