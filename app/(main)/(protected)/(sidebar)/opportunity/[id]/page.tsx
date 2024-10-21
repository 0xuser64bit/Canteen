import { getOpportunityAction } from "@/actions/opportunity/getOpportunity";
import { OpportunityDiscussPage } from "../../../_components/OpportunityDiscussPage";

export default async function OpportunityPage({
  params,
}: {
  params: { id: string };
}) {
  const opportunity = await getOpportunityAction(params.id);

  return (
    <div className="mx-auto p-4 max-w-4xl">
      <OpportunityDiscussPage opportunity={opportunity} />
    </div>
  );
}
