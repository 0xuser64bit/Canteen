"use client";

import { createPost } from "@/actions/post/createPost";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Image } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function WritePostPage() {
  const session = useSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const inputFile = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("Image");

  const handleOnFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
  };

  const publishPost = async () => {
    if (!title || !content) {
      toast.info("All fields are required");
      return;
    }
    setLoading(true);

    let imageUrl;
    // Todo: There should be a better way to do this.
    if (
      inputFile.current &&
      inputFile.current.name &&
      inputFile.current.size > 0
    ) {
      const storageRef = await ref(storage, inputFile.current?.name);
      try {
        await uploadBytes(storageRef, inputFile.current.files![0]);
        imageUrl = await getDownloadURL(storageRef);
      } catch (error) {
        toast.error(`Error uploading the file, ${error}`);
      }
    }
    // TODO: security concerns, I don't think using "email" in user is safe.(I could be so wrong here but need to check)
    await createPost({
      user: session.data?.user?.email!,
      title,
      content,
      imageUrl,
    })
      .then((post) => {
        if (!post) {
          toast.error("Error occured");
          return;
        }
        router.push("/home");
      })
      .finally(() => {
        setLoading(false);
      });
  };
  return (
    <div className="lg:w-2/3 mx-auto w-[80%]">
      <div>
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
          <Input
            name="title"
            id="title"
            placeholder="Write a specific title"
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            name="content"
            id="content"
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="Start a conversation. Keep it classy. No personal information or trade secrets"
          />

          <Button
            size={"lg"}
            type="button"
            onClick={publishPost}
            disabled={loading}
          >
            {loading ? <Spinner /> : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
}
