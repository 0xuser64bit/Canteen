import { auth } from "@/lib/auth";

import { getUniversityPosts } from "@/actions/universityPosts";
import { Timeline } from "../../_components/Timeline";

export default async function MyUniversityPage() {
  const session = await auth();
  const user = session?.user;

  const universityPosts = await getUniversityPosts({
    email: user?.email as string,
  });
  return (
    <>
      <Timeline allposts={universityPosts} />
      {universityPosts.length === 0 && (
        <div className="flex justify-center items-center gap-x-6">
          <div className="flex flex-col pt-10">
            <div className="text-center">
              <span className="text-lg font-bold">No Posts Found</span>
              <br />
              <span className="text-lg">
                No Post by anyone in your University.
              </span>
              <br />
              <span className="text-sm text-white/70">
                You can be first one to create a post.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
