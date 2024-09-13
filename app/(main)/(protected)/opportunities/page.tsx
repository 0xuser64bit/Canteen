import { OpportunityPost } from "../_components/OpportunityPost";

export default function OpportunitiesPage() {
  return (
    <div>
      <OpportunityPost
        title="Opportunity"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed tincidunt, ipsum eget hendrerit aliquet, justo nunc vestibulum turpis, id vestibulum metus nunc vitae massa."
        initialUpvotes={0}
        initialViews={0}
      />
    </div>
  );
}
