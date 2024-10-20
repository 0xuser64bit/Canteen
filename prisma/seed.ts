import db from "../db";
import { promises as fs } from "fs";
import path from "path";

const seedVerifyUniversity = async () => {
  const file = await fs.readFile(
    path.join(__dirname, "../ListOfUniversity/data.json"),
    "utf8",
  );
  const universityData = JSON.parse(file);

  universityData.map(async (university: any) => {
    const data = await db.validUniversity.create({
      data: {
        name: university.name,
        country: university.country,
        alpha_two_code: university.alpha_two_code,
        state_province: university.state_province,
      },
    });

    university.domains.map(async (domain: string) => {
      await db.domain.create({
        data: {
          domainName: domain,
          validUniversityId: data.id,
        },
      });
    });
    university.web_pages.map(async (webPage: string) => {
      await db.webPage.create({
        data: {
          webPageName: webPage,
          validUniversityId: data.id,
        },
      });
    });
  });
};
seedVerifyUniversity().catch((error) => {
  console.error("An unexpected error occurred during seeding:", error);
  process.exit(1);
});
