import Image from "next/image";
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
      {posts.length === 0 &&
        <div className="flex justify-center items-center gap-x-6">
          <div className="flex flex-col pt-10">
            <Image src={"/canteen-dark.png"} width={400} height={400} alt="not found" />
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
      }
    </div>
  );
};
