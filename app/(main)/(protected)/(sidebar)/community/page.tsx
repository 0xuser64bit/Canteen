import { getPostsByUser } from "@/actions/getPostsByUser";
import { auth } from "@/lib/auth";

import { Timeline } from "../../_components/Timeline";

export default async function CommunityPage() {
  const session = await auth();
  const user = session?.user;

  const posts = await getPostsByUser({ email: user?.email as string });
  return (
    <>
      <Timeline posts={posts} />
    </>
  );
}
