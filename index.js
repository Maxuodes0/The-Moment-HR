import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const databases = {
  employees: process.env.NOTION_DB_EMPLOYEES,
  vacation: process.env.VACATION_DB_ID,
};

async function showDatabaseFields(dbName, dbId) {
  console.log(`\n===== Fields in ${dbName} database =====`);

  if (!dbId) {
    console.log(`❌ Missing DB ID for ${dbName}`);
    return;
  }

  try {
    // نجيب معلومات الداتابيس
    const response = await notion.databases.retrieve({ database_id: dbId });

    const props = response.properties;

    console.log(`Found ${Object.keys(props).length} fields:\n`);

    for (const [fieldName, fieldInfo] of Object.entries(props)) {
      const type = fieldInfo.type;
      console.log(`- ${fieldName} (${type})`);
    }

  } catch (err) {
    console.error(`❌ Error fetching fields for ${dbName}:`, err.message);
  }
}

async function main() {
  for (const [name, id] of Object.entries(databases)) {
    await showDatabaseFields(name, id);
  }
}

main();
