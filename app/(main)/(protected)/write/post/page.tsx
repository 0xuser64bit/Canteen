"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Image } from "lucide-react";
import { useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Spinner } from "@/components/Spinner";
import { createPost } from "@/actions/createPost";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function WritePostPage() {
  const session = useSession();
  const router = useRouter();
  const inputFile = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("Image");

  const handleOnFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
  };

  const publishPost = async (formData: FormData) => {
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const file = formData.get("file") as File | null;
    if (!title || !content) {
      toast.info("All fields are required");
      return;
    }
    setLoading(true);

    let imageUrl;
    // Todo: There should be a better way to do this.
    if (file && file.name && file.size > 0) {
      const storageRef = await ref(storage, file?.name);
      try {
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
      } catch (error) {
        toast.error(`Error uploading the file, ${error}`);
      }
    }
    // TODO: security concerns, I don't think using "email" in user is safe.(I could be so wrong here but need to check)
    createPost({
      user: session.data?.user?.email as string,
      title,
      content,
      imageUrl,
    })
      .then((post) => {
        if (!post) {
          toast.error("Error occured");
          return;
        }
        router.push("/community");
      })
      .finally(() => {
        setLoading(false);
      });
  };
  return (
    <div className="lg:w-2/3 mx-auto w-[80%]">
      <form action={publishPost}>
        <div className="py-4 flex flex-col gap-y-4">
          <div className="">
            <input
              type="file"
              name="file"
              id="file"
              ref={inputFile}
              accept="image/png, image/jpeg"
              style={{ display: "none" }}
              onChange={(e) => handleOnFileChange(e)}
            />
            <Button
              type="button"
              variant={"outline"}
              onClick={() => {
                inputFile.current?.click();
              }}
            >
              <Image className="w-4 h-4 mr-1" /> <span>{fileName}</span>
            </Button>
          </div>
          <Input name="title" id="title" placeholder="Write a specific title" />
          <Textarea
            name="content"
            id="content"
            placeholder="Start a conversation. Keep it classy. No personal information or trade secrets"
          />

          <Button size={"lg"} type="submit">
            {loading ? <Spinner /> : "Post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
