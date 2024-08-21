"use client";

import { createPost } from "@/actions/createPost";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircleIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export const WritePost = () => {
  const session = useSession();
  const handleCreatePost = async (formData: FormData) => {
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    if (!title || !content) {
      toast.info("All fields are required");
      return;
    }
    const user = session.data?.user?.email as string;
    const post = await createPost({
      user,
      title,
      content,
    });
    if (!post) {
      toast.error("Error occured");
      return;
    }
    toast.success("post created successfully");
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="mb-4 border rounded-lg" role="button">
          <div className="px-4 py-6 flex space-x-2 items-center">
            <PlusCircleIcon className="w-5 h-5 text-red-500" />
            <p className="text-sm text-muted-foreground text-slate-400 font-bold">
              Start a post...
            </p>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write a post</DialogTitle>
        </DialogHeader>
        <form action={handleCreatePost}>
          <div className="py-4 flex flex-col gap-y-4">
            <Input
              name="title"
              id="title"
              placeholder="Write a specific title"
            />
            <Textarea
              name="content"
              id="content"
              placeholder="Start a conversation. Keep it classy. No personal information or trade secrets"
            />
          </div>
          <DialogFooter>
            <DialogTrigger>
              <Button type="submit">Post</Button>
            </DialogTrigger>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
