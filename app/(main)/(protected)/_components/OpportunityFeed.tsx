"use client";

import { useState } from "react";
import { OpportunityPost } from "./OpportunityPost";
import { SearchAndCreateOpportunity } from "./SearchAndCreateOpportunity";

export const OpportunityFeed = ({
  allOpportunies,
}: {
  allOpportunies: any;
}) => {
  const [opportunies, setOpportunities] = useState(allOpportunies);
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
          opportunies={opportunies}
        />
      </div>
      <OpportunityPost
        id={1}
        title="Opportunity 1"
        description="This is a description of the opportunity"
        initialUpvotes={10}
        initialViews={10}
        created_on="2023-03-01"
        tags={["tag1", "tag2"]}
      />
    </div>
  );
};
