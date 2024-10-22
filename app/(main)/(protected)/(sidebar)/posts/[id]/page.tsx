import { getPostAction } from "@/actions/post/getPost";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/helper";
import { CommentInterection } from "../../../_components/CommentInterection";
import { GoBack } from "../../../_components/GoBack";
import { PostInterection } from "../../../_components/PostInterection";

export default async function PostPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const post = await getPostAction({
    postId: params?.id as string,
    email: session?.user?.email!,
  });
  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div className="">
      <GoBack />
      <Card className="mb-4 bg-[#f9f9fb] dark:bg-black dark:bg-opacity-20 ">
        <CardHeader className="border-b border-slate-300/10">
          <div className="flex items-center justify-between mb-2">
            {/* Todo: add tag while creating post */}
            <Badge variant="secondary" className="text-xs">
              {"Career"}
            </Badge>
            <span className="text-xs text-gray-500">
              {formatDate(post.createdAt!)}
            </span>
          </div>
          <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm mb-4">{post.content}</p>
          {post.mediaUrl && (
            <div className="flex justify-center items-center overflow-hidden pb-2">
              <img
                src={post.mediaUrl as string}
                alt="media image"
                className="object-cover rounded-lg border"
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-slate-300/10">
          <div className="w-full">
            <PostInterection
              likes={post.totalLikes?.likes ?? 0}
              comments={post.totalComments?.length!}
              views={0}
              hasLiked={post.hasLiked}
              shares={0}
              postId={params.id}
            />
          </div>
        </CardFooter>
      </Card>
      <CommentInterection
        comments={post.totalComments ?? []}
        postId={params?.id}
        email={session?.user?.email!}
      />
    </div>
  );
}
