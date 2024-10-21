import { OpportunityPost } from "../../_components/OpportunityPost";

export default function OpportunitiesPage() {
  return (
    <div>
      <OpportunityPost
        title="Opportunity 1"
        description="This is a description of the opportunity"
        initialUpvotes={10}
        initialViews={10}
        created_on="2023-03-01"
        tags={["tag1", "tag2"]}
      />
    </div>
  );
}
