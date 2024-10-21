import { getAllOpportunityAction } from "@/actions/opportunity/getAllOpportunity";
import { OpportunityFeed } from "../../_components/OpportunityFeed";

export default async function OpportunitiesPage() {
  const allOpportunities = await getAllOpportunityAction();
  return (
    <div>
      <OpportunityFeed allOpportunities={allOpportunities} />
    </div>
  );
}
