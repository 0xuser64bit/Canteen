"use client";

import { formatDate } from "@/lib/helper";
import { useEffect, useState } from "react";
import { OpportunityPost } from "./OpportunityPost";
import { SearchAndCreateOpportunity } from "./SearchAndCreateOpportunity";

export const OpportunityFeed = ({
  allOpportunities,
  userId,
}: {
  allOpportunities: any[];
  userId: string;
}) => {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  useEffect(() => {
    if (allOpportunities.length !== 0) {
      setOpportunities(allOpportunities);
    }
  }, [allOpportunities]);
  return (
    <div>
      <div>
        <SearchAndCreateOpportunity
          setOpportunities={setOpportunities}
          opportunities={opportunities}
        />
      </div>
      {!!opportunities.length &&
        opportunities.map((opportunity: any) => (
          <OpportunityPost
            id={opportunity.id}
            title={opportunity.title}
            description={opportunity.description}
            totalUpvotes={opportunity.totalUpvotes.upvotes}
            totalViews={opportunity.views}
            hasUpvoted={opportunity.hasUpvoted}
            created_on={formatDate(opportunity.createdAt)}
            tags={opportunity.tags.map((tag: any) => tag.name)}
            userId={userId}
          />
        ))}
      {!opportunities.length && (
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
