import { getPostsHome } from "@/actions/post/getPostsHome";
import { auth } from "@/lib/auth";

import { Timeline } from "../../_components/Timeline";

export default async function HomePage() {
  const session = await auth();
  const user = session?.user;

  const posts = await getPostsHome({ email: user?.email as string });
  return (
    <>
      <Timeline allposts={posts} />
    </>
  );
}
