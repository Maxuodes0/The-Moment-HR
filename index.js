import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const EMPLOYEES_DB_ID = process.env.NOTION_DB_EMPLOYEES;
const VACATION_DB_ID = process.env.VACATION_DB_ID;

// اسم خيار حالة الطلب اللي تبيه في Notion (لازم يكون نفس اللي في Notion)
const REVIEW_STATUS_NAME = "تحت المراجعة";

async function findEmployeeById(nationalId) {
  if (!EMPLOYEES_DB_ID) {
    console.error("❌ NOTION_DB_EMPLOYEES is missing.");
    return null;
  }

  if (!nationalId) return null;

  try {
    const response = await notion.databases.query({
      database_id: EMPLOYEES_DB_ID,
      filter: {
        property: "رقم الهوية",
        rich_text: {
          equals: String(nationalId),
        },
      },
      page_size: 1,
    });

    if (response.results.length === 0) {
      console.log(`❌ No employee found with رقم الهوية = ${nationalId}`);
      return null;
    }

    const page = response.results[0];
    const nameProp = page.properties["اسم الموظف"];
    const name =
      nameProp &&
      nameProp.title &&
      nameProp.title[0] &&
      nameProp.title[0].plain_text;

    if (!name) {
      console.log(
        `❌ Employee found but اسم الموظف is empty for رقم الهوية = ${nationalId}`
      );
      return null;
    }

    console.log(`✔ Found employee "${name}" for رقم الهوية = ${nationalId}`);
    return { id: page.id, name };
  } catch (err) {
    console.error("❌ Error finding employee:", err.message);
    return null;
  }
}

async function processVacationRequests() {
  if (!VACATION_DB_ID) {
    console.error("❌ VACATION_DB_ID is missing.");
    return;
  }

  console.log("===== Processing vacation requests =====");

  try {
    // حالياً بنجيب أول 50 طلب، نقدر نضيف pagination لاحقاً
    const response = await notion.databases.query({
      database_id: VACATION_DB_ID,
      page_size: 50,
    });

    console.log(`Found ${response.results.length} vacation requests.\n`);

    for (const page of response.results) {
      const pageId = page.id;

      const props = page.properties;

      // رقم الأحوال / الإقامة من جدول الإجازات
      const nationalId = props["رقم الاحوال/الاقامة"]?.number;

      // حالة الطلب الحالية
      const currentStatus = props["حالة الطلب"]?.select?.name;

      console.log(
        `\n--- Vacation request ${pageId} ---\n` +
          `رقم الاحوال/الاقامة: ${nationalId ?? "N/A"}\n` +
          `حالة الطلب الحالية: ${currentStatus ?? "غير محددة"}`
      );

      // 1) نعدل حالة الطلب إلى "تحت المراجعة" إذا كانت غيرها
      const newStatusNeeded = currentStatus !== REVIEW_STATUS_NAME;

      // 2) نبحث عن الموظف ونحدّث الاسم
      let employeeName = null;
      if (nationalId) {
        const employee = await findEmployeeById(nationalId);
        if (employee) {
          employeeName = employee.name;
        }
      } else {
        console.log("⚠ لا يوجد رقم احوال/اقامة في هذا الطلب.");
      }

      // نبني properties للتحديث
      const updateProps = {};

      if (newStatusNeeded) {
        updateProps["حالة الطلب"] = {
          select: { name: REVIEW_STATUS_NAME },
        };
      }

      if (employeeName) {
        updateProps["اسم الموظف"] = {
          title: [
            {
              type: "text",
              text: { content: employeeName },
            },
          ],
        };
      }

      if (Object.keys(updateProps).length === 0) {
        console.log("لا يوجد شيء لتحديثه لهذا الطلب.");
        continue;
      }

      try {
        await notion.pages.update({
          page_id: pageId,
          properties: updateProps,
        });

        console.log(
          `✔ Updated vacation request:\n` +
            (newStatusNeeded
              ? `  - حالة الطلب → ${REVIEW_STATUS_NAME}\n`
              : "") +
            (employeeName ? `  - اسم الموظف → ${employeeName}\n` : "")
        );
      } catch (err) {
        console.error(
          `❌ Error updating vacation request ${pageId}:`,
          err.message
        );
      }
    }
  } catch (err) {
    console.error("❌ Error querying vacation database:", err.message);
  }
}

async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error("❌ NOTION_TOKEN is missing.");
    return;
  }

  await processVacationRequests();
}

main();
