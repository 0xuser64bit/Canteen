"use client";

import { useEffect, useState } from "react";
import { OpportunityPost } from "./OpportunityPost";
import { SearchAndCreateOpportunity } from "./SearchAndCreateOpportunity";
import { formatDate } from "@/lib/helper";

export const OpportunityFeed = ({
  allOpportunities,
}: {
  allOpportunities: any;
}) => {
  const [opportunities, setOpportunities] = useState(allOpportunities);
  useEffect(() => {
    if (allOpportunities.length !== 0) {
      setOpportunities(allOpportunities);
    }
  });
  return (
    <div>
      <div>
        {/* 
          Todo: Search bar and create Opportunity button 
          fetch all opportunities from the database
          use state variable and pass setOpportunity to search bar component and setOpportunity from there to showcase in below opportunity section.
        */}
        <SearchAndCreateOpportunity
          setOpportunities={setOpportunities}
          opportunities={opportunities}
        />
      </div>
      {opportunities &&
        opportunities.map((opportunity: any) => (
          <OpportunityPost
            id={opportunity.id}
            title={opportunity.title}
            description={opportunity.description}
            initialUpvotes={opportunity.upvotes}
            initialViews={opportunity.views}
            created_on={formatDate(opportunity.createdAt)}
            tags={opportunity.tags.map((tag: any) => tag.name)}
          />
        ))}
      {!opportunities && (
        <div className="text-center pt-10">
          <p className="text-2xl font-bold">No Opportunity Created yet.</p>
          <p className="text-sm dark:text-gray-300">
            Create one by clicking on Create button
          </p>
        </div>
      )}
    </div>
  );
};
