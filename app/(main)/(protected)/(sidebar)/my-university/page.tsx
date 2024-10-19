import { getPostsByUser } from "@/actions/getPostsByUser";
import { auth } from "@/lib/auth";

import { Timeline } from "../../_components/Timeline";
import { getUniversityPosts } from "@/actions/universityPosts";

export default async function MyUniversityPage() {
  const session = await auth();
  const user = session?.user;

  const universityPosts = await getUniversityPosts({
    userUniversity: "",
  })

  const posts = await getPostsByUser({ email: user?.email as string });
  return (
    <>
      <Timeline posts={universityPosts} />
    </>
  );
}
