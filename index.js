import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// هنا نحط كل الداتابيس اللي موجودة في Secrets
const databases = {
  employees: process.env.NOTION_DB_EMPLOYEES,
  vacation: process.env.VACATION_DB_ID
};

async function readDatabase(dbName, dbId) {
  console.log(`\n===== Reading ${dbName} database =====`);

  if (!dbId) {
    console.log(`❌ Database ID for ${dbName} is missing.`);
    return;
  }

  try {
    const response = await notion.databases.query({
      database_id: dbId,
      page_size: 10,
    });

    console.log(`✔ Found ${response.results.length} rows in ${dbName}`);

    response.results.forEach((page) => {
      console.log(`- Page ID: ${page.id}`);
    });
  } catch (err) {
    console.log(`❌ Error reading ${dbName}:`, err.message);
  }
}

async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error("❌ NOTION_TOKEN is missing.");
    return;
  }

  for (const [name, id] of Object.entries(databases)) {
    await readDatabase(name, id);
  }
}

main();
