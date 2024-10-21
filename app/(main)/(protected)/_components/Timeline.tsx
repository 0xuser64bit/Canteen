import { Post } from "./Post";
import { QuickPost } from "./QuickPost";

export const Timeline = async ({ posts }: { posts: any }) => {
  // Todo: Modify this component as such when opening profile it will show the user's post otherwise it will show post from other people.
  // also in feed and my university section it will show different posts(in one it will randomly show user's choice related posts and in one only posts from university)

  return (
    <div>
      <QuickPost />
      {posts && posts?.map((post: any) => (
        <Post
          key={post.id}
          id={post.id}
          image={post.author?.image}
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
