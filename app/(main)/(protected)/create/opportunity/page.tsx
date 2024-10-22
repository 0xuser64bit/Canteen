"use client";

import { createOpportunityAction } from "@/actions/opportunity/createOpportunity";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateRandomColour } from "@/lib/helper";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function CreateOpportunityPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<{ [tag: string]: string }>({});
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const session = useSession();

  const handleOpportunitySubmit = async () => {
    if (!title || !description) {
      toast.error("Please fill in all the fields");
      return;
    }
    if (title.length <= 10) {
      toast.error("Title must be more than 10 characters");
      return;
    }
    if (description.length <= 180) {
      toast.error("Description must be more than 180 characters");
      return;
    }
    setLoading(true);
    try {
      const response = await createOpportunityAction({
        title,
        description,
        userId: session.data?.user?.email!,
        tags: Object.keys(tags),
      });
      if (response) {
        toast.success("Opportunity created successfully!");
      }
    } catch (err) {
      toast.error("Unable to create Opportunity");
    } finally {
      setLoading(false);
      setTitle("");
      setDescription("");
      setTags({});
      router.push("/opportunities");
      router.refresh();
    }
  };

  const addTag = () => {
    if (newTag && !Object.keys(tags).includes(newTag) && newTag.length > 0) {
      setTags({ ...tags, [newTag]: generateRandomColour() });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    tags[tagToRemove] = "";
    const newTags = Object.entries(tags).filter(
      ([key, value]) => key !== tagToRemove,
    );
    setTags(Object.fromEntries(newTags));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h3 className="font-bold text-2xl mb-6 text-center">
        Create Opportunity
      </h3>

      {Object.keys(tags).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(tags).map(([tag, colour]) => (
            <span
              key={tag}
              className={`text-primary-foreground px-2 py-1 rounded-full text-sm flex items-center`}
              style={{ backgroundColor: colour }}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-2 hover:text-red-500 focus:outline-none"
                aria-label={`Remove ${tag} tag`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="title" className="font-bold">
            Title
          </Label>
          <Input
            name="title"
            id="title"
            placeholder="Write an understandable title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="description" className="font-bold">
            Description
          </Label>
          <Textarea
            name="description"
            id="description"
            placeholder="Write a brief description of the opportunity"
            rows={10}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="tags" className="font-bold">
            Tags
          </Label>
          <div className="flex gap-2">
            <Input
              name="tags"
              id="tags"
              placeholder="Add a tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
            />
            <Button type="button" onClick={addTag}>
              Add Tag
            </Button>
          </div>
        </div>

        <Button
          className="w-full"
          type="button"
          onClick={handleOpportunitySubmit}
          disabled={loading}
        >
          {loading ? <Spinner /> : "Create Opportunity"}
        </Button>
      </div>
    </div>
  );
}
