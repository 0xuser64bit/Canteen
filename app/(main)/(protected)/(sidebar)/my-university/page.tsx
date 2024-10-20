import { auth } from "@/lib/auth";

import { getUniversityPosts } from "@/actions/universityPosts";
import { Timeline } from "../../_components/Timeline";

export default async function MyUniversityPage() {
  const session = await auth();
  const user = session?.user;

  const universityPosts = await getUniversityPosts({
    userUniversity: "",
  })
  return (
    <>
      <Timeline posts={universityPosts} />
    </>
  );
}
