import { Post } from "./Post";
import { QuickPost } from "./QuickPost";

/*
  // Fix: types
  type User = {

  }
  type Like = {

  }
  type PostView = {

  }

  type Post = {
    id: string,
    title: string,
    content: string,
    mediaUrl: string | null,
    mediaType: string | null,
    likesCount: number | 0,
    viewsCount: number | 0,
    auther: User,
    likes: Like[],
    views: PostView[],
    type: public | private
  }
*/

export const Timeline = async ({ posts }: { posts: any }) => {
  // Todo: Modify this component as such when opening profile it will show the user's post otherwise it will show post from other people.
  // also in feed and my university section it will show different posts(in one it will randomly show user's choice related posts and in one only posts from university)

  /*
    Feed          ==> db.post.findMany({where: {type: 'public'}}) // Recommendation Algorithm based on User Activity or Selections
    My University ==> filter out posts by university
    Polls         ==> filter out posts by type='poll'
    All Channles  ==> Show all available Channles(i.e, Trending, Communities, Clubs, etc)
  */

  return (
    <div>
      <QuickPost />
      {posts?.map((post: any) => (
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
