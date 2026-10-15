import { Suspense } from "react";
import { Discover } from "@/components/discover";
import { MobileNav, SideNav } from "@/components/nav";
import { SearchPalette } from "@/components/search";
import { requireViewer } from "@/lib/session";
import { getUnreadCount } from "@/server/queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireViewer();
  const unread = await getUnreadCount(viewer);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1320px]">
      <Suspense>
        <SideNav unread={unread} university={viewer.university.name} />
      </Suspense>
      <main className="min-w-0 flex-1 pb-24 lg:border-x lg:border-line lg:pb-0">
        {children}
      </main>
      <aside className="sticky top-0 hidden h-dvh w-[320px] shrink-0 overflow-y-auto px-5 py-6 xl:block">
        <Suspense>
          <Discover />
        </Suspense>
      </aside>
      <Suspense>
        <MobileNav unread={unread} />
      </Suspense>
      <SearchPalette />
    </div>
  );
}
