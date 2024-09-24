"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Maximize2, PlusCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { createPost } from "@/actions/createPost";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const QuickPost = () => {
  const session = useSession();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errors, setErrors] = useState({ title: "", content: "" });

  // Todo: I don't know if this should be done as formData or will it be better if we had state variables here instead?.🤷‍♂️
  const handleCreatePost = async (formData: FormData) => {
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;

    if (!title || !content) {
      setErrors({
        title: title ? "" : "Title is required*",
        content: content ? "" : "Content is required*",
      });
      setIsDialogOpen(true);
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
    setIsDialogOpen(false);
    setErrors({
      title: "",
      content: "",
    });
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setErrors({ title: "", content: "" });
    }
    setIsDialogOpen(open);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <div className="mb-4 border rounded-lg" role="button">
          <div className="px-4 py-6 flex space-x-2 items-center">
            <PlusCircleIcon className="w-5 h-5 text-red-500" />
            <p className="text-sm text-muted-foreground text-slate-400 font-bold">
              Quick Post
            </p>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <p className="flex gap-x-2">
              <p>Quick Post</p>
              <Maximize2
                className="w-4 h-4 hover:text-slate-300/80 ease-in-out"
                role="button"
                onClick={() => {
                  router.push("/write/post");
                }}
              />
            </p>
          </DialogTitle>
        </DialogHeader>
        <form action={handleCreatePost}>
          <div className="py-4 flex flex-col gap-y-4">
            <div>
              <Input
                name="title"
                id="title"
                placeholder="Write a specific title"
                onChange={() => setErrors({ ...errors, title: "" })}
              />
              {errors.title && (
                <p className="text-red-500 text-xs ms-1 mt-1 font-bold">
                  {errors.title}
                </p>
              )}
            </div>
            <div>
              <Textarea
                name="content"
                id="content"
                placeholder="Start a conversation. Keep it classy. No personal information or trade secrets"
                onChange={() => setErrors({ ...errors, content: "" })}
              />
              {errors.content && (
                <p className="text-red-500 text-xs ms-1 mt-1 font-bold">
                  {errors.content}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogTrigger>
              <Button type="submit" onClick={(e) => e.stopPropagation()}>
                Post
              </Button>
            </DialogTrigger>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
