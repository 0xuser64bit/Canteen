import { auth } from "@/lib/auth";
import { Post } from "./Post";
import { getPostsByUser } from "@/actions/getPostsByUser";

export const Timeline = async () => {
  const session = await auth();
  const user = session?.user;
  const posts = await getPostsByUser({ userId: user?.id! });
  return (
    <div>
      {posts?.map((post) => (
        <Post
          key={post.id}
          title={post.title}
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
