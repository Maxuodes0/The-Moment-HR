import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN, // بنحطها كـ secret بعدين، مو في الكود
});

const databaseId = process.env.NOTION_DATABASE_ID; // هنا رقم الداتابيس

async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error("NOTION_TOKEN is missing");
    return;
  }
  if (!databaseId) {
    console.error("NOTION_DATABASE_ID is missing");
    return;
  }

  console.log("Reading Notion database...");

  const response = await notion.databases.query({
    database_id: databaseId,
    page_size: 5, // مؤقت: أول 5 سجلات بس
  });

  console.log("Number of results:", response.results.length);

  for (const page of response.results) {
    console.log("Page id:", page.id);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
});
