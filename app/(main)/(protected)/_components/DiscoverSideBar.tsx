import { getLatestUpdateAction } from "@/actions/discover";
import { Discover } from "./Discover";

export const DiscoverSideBar = async () => {
  const { opportunities, posts } = await getLatestUpdateAction();
  return (
    <>
      <Discover opportunities={opportunities} posts={posts} />
    </>
  );
};
