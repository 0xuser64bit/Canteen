import { OpportunityPost } from "../_components/OpportunityPost";

export default function OpportunitiesPage() {
  // TODO: fetch opportunities from db and map them to OpportunityPost components
  return (
    <div>
      <div>
        <OpportunityPost
          title="big Opportunity at some random club"
          description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed tincidunt, ipsum eget hendrerit aliquet, justo nunc vestibulum turpis, id vestibulum metus nunc vitae massa."
          initialUpvotes={0}
          initialViews={0}
          created_on="14th December 2014 21:00:00"
          tags={["Tech", "Marketing", "Sports"]}
        />
      </div>
    </div>
  );
}
