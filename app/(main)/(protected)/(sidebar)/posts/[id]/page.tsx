import { getPostAction } from "@/actions/post/getPost";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ThumbsDown, ThumbsUp } from "lucide-react";
import { PostFooter } from "../../../_components/PostFooter";

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPostAction({ postId: params?.id as string });
  const formatDate = (dateString: Date) => {
    const options: any = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };
  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div className="">
      <div className="w-8 py-2 px-1 hover:bg-slate-400/30 dark:hover:bg-slate-500/30 rounded-full cursor-pointer">
        <ArrowLeft className="w-6 h-5 mr-2 text-black dark:text-white" />
      </div>
      <Card className="mb-2 bg-[#f9f9fb] dark:bg-black dark:bg-opacity-20 ">
        <CardHeader className="border-b border-slate-300/10">
          <div className="flex items-center justify-between mb-2">
            {/* Todo: add tag while creating post */}
            <Badge variant="secondary" className="text-xs">
              {"Career"}
            </Badge>
            <span className="text-xs text-gray-500">
              {formatDate(post.createdAt)}
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
          <PostFooter />
        </CardFooter>
      </Card>

      <Card className="mb-8 bg-[#f9f9fb] dark:bg-black dark:bg-opacity-20 ">
        <CardHeader className="border-b">
          <h3 className="text-lg font-semibold">Comments</h3>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-8 h-8">
              <AvatarFallback>CC</AvatarFallback>
            </Avatar>
            <Input
              placeholder="What are your thoughts?"
              className="flex-grow bg-[#f9f9fb] dark:bg-black "
            />
          </div>
          <Button className="mb-6">Post anonymously</Button>
          <Separator className="my-6" />
          {[
            {
              company: "FAANG",
              content:
                "The job market is tough, but there are still opportunities. Focus on building strong projects and networking.",
            },
            {
              company: "Startup",
              content:
                "Consider joining a startup. We're always looking for fresh talent and you'll get hands-on experience.",
            },
            {
              company: "Consulting",
              content:
                "Don't forget about consulting firms. They often have good entry-level positions for new grads.",
            },
          ].map((comment, index) => (
            <div key={index} className="mb-6">
              <div className="flex items-start gap-4 mb-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>{comment.company[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {comment.company}
                    </span>
                    <span className="text-xs text-gray-500">• 2h ago</span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <Button variant="ghost" size="sm">
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      Agree
                    </Button>
                    <Button variant="ghost" size="sm">
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      Disagree
                    </Button>
                    <Button variant="ghost" size="sm">
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
