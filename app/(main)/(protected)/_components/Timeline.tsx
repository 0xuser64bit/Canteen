import { auth } from "@/lib/auth";
import { Post } from "./Post";
import { getPostsByUser } from "@/actions/getPostsByUser";
import { WritePost } from "./WritePost";

export const Timeline = async () => {
  const session = await auth();
  const user = session?.user;

  const posts = await getPostsByUser({ email: user?.email as string });
  return (
    <div>
      <WritePost />
      {posts?.map((post) => (
        <Post
          key={post.id}
          title={post.title}
          media={post.mediaUrl as string}
          mediaType={post.mediaType as string}
          content={post.content}
          likes={0}
          shares={0}
          views={0}
          comments={0}
        />
      ))}
    </div>
  );
};
