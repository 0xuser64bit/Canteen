import { PostCardSkeleton } from "@/components/post";
import { LogoMark } from "@/components/logo";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading conversations"
      className="flex flex-col gap-6 px-4 py-8 lg:px-6"
    >
      <div
        aria-hidden
        className="flex items-center gap-2 text-[13px] font-semibold text-muted"
      >
        <LogoMark className="brand-loader size-8" /> Getting the conversation
        ready…
      </div>
      <PostCardSkeleton />
      <PostCardSkeleton mine />
      <PostCardSkeleton />
    </div>
  );
}
