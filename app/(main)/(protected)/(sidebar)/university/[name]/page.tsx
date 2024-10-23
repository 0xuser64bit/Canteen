// university/[name]/page.tsx
import { getAllPostOfUniveristy } from "@/actions/post/getAllPostOfUniversity";
import { auth } from "@/lib/auth";
import { Post } from "../../../_components/Post";

export default async function UniversityPage({
  params,
}: {
  params: { name: string };
}) {
  const session = await auth();
  const universityName = params.name.split("-").join(" ").trim();
  const universityPosts = await getAllPostOfUniveristy({
    universityName,
    email: session?.user?.email!,
  });
  return (
    <div>
      {universityPosts.map((post) => (
        <Post
          key={post.id}
          id={post.id}
          image={post.author?.image ?? "/canteen-dark.png"}
          university={post.author?.university!}
          title={post.title}
          media={post.mediaUrl as string}
          mediaType={post.mediaType as string}
          content={post.content}
          hasLiked={post.hasLiked}
          totalLikes={post.totalLikes.likes!}
          shares={post.shares ?? 0}
          views={post.views}
          comments={post.totalComments.length!}
        />
      ))}
    </div>
  );
}
