import { getOpportunityAction } from "@/actions/opportunity/getOpportunity";
import { OpportunityDiscussPage } from "../../../_components/OpportunityDiscussPage";
import { auth } from "@/lib/auth";

export default async function OpportunityPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const opportunity = await getOpportunityAction({
    id: params.id,
    email: session?.user?.email!,
  });

  return (
    <div className="mx-auto p-4 max-w-4xl">
      <OpportunityDiscussPage
        id={opportunity.id!}
        title={opportunity.title!}
        description={opportunity.description!}
        totalUpvotes={opportunity.totalUpvotes?.upvotes ?? 0}
        totalViews={opportunity.views!}
        hasUpvoted={opportunity.hasUpvoted}
        userId={session?.user?.email!}
        tags={opportunity.tags?.map((tag) => tag.name) ?? []}
        comments={opportunity.OpportunityComment || []}
      />
    </div>
  );
}
