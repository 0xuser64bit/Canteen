import { PostCardSkeleton } from "@/components/post";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex flex-col gap-6 px-4 pt-28 lg:px-6"
    >
      <PostCardSkeleton />
      <PostCardSkeleton mine />
      <PostCardSkeleton />
    </div>
  );
}
