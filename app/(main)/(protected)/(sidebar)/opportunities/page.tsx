import { getAllOpportunityAction } from "@/actions/opportunity/getAllOpportunity";
import { OpportunityFeed } from "../../_components/OpportunityFeed";
import { auth } from "@/lib/auth";

export default async function OpportunitiesPage() {
  const session = await auth();
  const allOpportunities = await getAllOpportunityAction({ email: session?.user?.email! });
  return (
    <div>
      <OpportunityFeed allOpportunities={allOpportunities} />
    </div>
  );
}
