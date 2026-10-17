import { PostCardSkeleton } from "@/components/post";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading collection"
      className="flex min-h-80 flex-col gap-6 px-4 py-6 lg:px-6"
    >
      <PostCardSkeleton />
      <PostCardSkeleton mine />
    </div>
  );
}
