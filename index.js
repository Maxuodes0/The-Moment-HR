import { Client } from "@notionhq/client";
import nodemailer from "nodemailer";

// ======================================================
// 1) Notion Setup
// ======================================================

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const EMPLOYEES_DB_ID = process.env.NOTION_DB_EMPLOYEES;
const VACATION_DB_ID = process.env.VACATION_DB_ID;

const STATUS_REVIEW = "تحت المراجعة";
const STATUS_APPROVED = "موافقة";
const STATUS_REJECTED = "مرفوضة";

const EMAIL_FLAG_PROPERTY = "هل تم ارسال ايميل؟";

// ======================================================
// 2) Date Helpers
// ======================================================

function formatDate(dateStr) {
  if (!dateStr) return "غير محدد";
  return new Date(dateStr).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function addOneDay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// ======================================================
// 3) EMAIL HTML — NOW 100% RTL FIXED
// ======================================================

function buildVacationEmailHtml({
  employeeName,
  vacationType,
  startDate,
  endDate,
  days,
  backToWork,
  status,
}) {
  let mainTitle = "";
  let intro = "";
  let statusLine = "";

  switch (status) {
    case STATUS_REVIEW:
      mainTitle = "تم استلام طلب الإجازة الخاص بك";
      intro = `عزيزي <strong>${employeeName}</strong>،`;
      statusLine = `تم استلام طلب الإجازة وهو الآن <strong>تحت المراجعة</strong>.`;
      break;

    case STATUS_APPROVED:
      mainTitle = "تمت الموافقة على طلب الإجازة الخاص بك";
      intro = `عزيزي <strong>${employeeName}</strong>،`;
      statusLine = `نود إبلاغك بأنه تمت <strong>الموافقة</strong> على طلب الإجازة.`;
      break;

    case STATUS_REJECTED:
      mainTitle = "بشأن طلب الإجازة الخاص بك";
      intro = `عزيزي <strong>${employeeName}</strong>،`;
      statusLine = `نأسف لإبلاغك بأن طلب الإجازة أصبح <strong>مرفوضًا</strong>.`;
      break;
  }

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <body style="margin:0;padding:0;background-color:#000;color:white;font-family:Arial; direction: rtl; text-align: right; unicode-bidi: bidi-override;">

    <table width="100%" style="direction: rtl; unicode-bidi: bidi-override; text-align:right;">
      <tr><td align="center">
        <table width="600" style="background:#000;max-width:100%; direction: rtl; unicode-bidi: bidi-override;">
          <tr>
            <td>
              <img src="cid:themoment-header" style="width:100%;height:auto;" />
            </td>
          </tr>

          <tr><td style="padding:24px; direction: rtl; text-align: right; unicode-bidi: bidi-override;">
            
            <h1 style="margin:0 0 12px 0; direction: rtl; unicode-bidi: bidi-override;">${mainTitle}</h1>
            <p style="direction: rtl; unicode-bidi: bidi-override;">${intro}</p>
            <p style="direction: rtl; unicode-bidi: bidi-override;">${statusLine}</p>

            <h3 style="color:#ffb37a; direction: rtl; unicode-bidi: bidi-override;">🗂️ تفاصيل الطلب:</h3>

            <table width="100%" style="color:#ddd; direction: rtl; unicode-bidi: bidi-override; text-align:right;">
              <tr>
                <td style="color:#ffd2a3;font-weight:bold;">نوع الإجازة:</td>
                <td>${vacationType}</td>
              </tr>

              <tr>
                <td style="color:#ffd2a3;font-weight:bold;">من تاريخ:</td>
                <td>${startDate}</td>
              </tr>

              <tr>
                <td style="color:#ffd2a3;font-weight:bold;">إلى تاريخ:</td>
                <td>${endDate}</td>
              </tr>

              <tr>
                <td style="color:#ffd2a3;font-weight:bold;">عدد الأيام:</td>
                <td>${days} يوم</td>
              </tr>

              <tr>
                <td style="color:#ffd2a3;font-weight:bold;">تاريخ العودة:</td>
                <td>${backToWork}</td>
              </tr>
            </table>

            <p style="margin-top:16px; direction: rtl; unicode-bidi: bidi-override;">
              في حال وجود أي استفسارات، يمكنك التواصل مع قسم الموارد البشرية.
            </p>

            <p style="margin-top:12px; direction: rtl; unicode-bidi: bidi-override;">
              مع التحية،<br>فريق الموارد البشرية – The Moment
            </p>

          </td></tr>

          <tr>
            <td style="padding:16px;text-align:right;color:#aaa;font-size:12px;border-top:1px solid #333;">
              © The Moment – جميع الحقوق محفوظة.
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

  </body>
</html>
`;
}

// ======================================================
// 4) SMTP
// ======================================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ======================================================
// 5) SEND EMAIL
// ======================================================

async function sendEmail(to, employeeName, info, status) {
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;

  const html = buildVacationEmailHtml({
    employeeName,
    vacationType: info.vacationType,
    startDate: info.startDate,
    endDate: info.endDate,
    days: info.days,
    backToWork: info.backToWork,
    status,
  });

  const subjects = {
    [STATUS_REVIEW]: "تم استلام طلب الإجازة الخاص بك",
    [STATUS_APPROVED]: "تمت الموافقة على طلب الإجازة",
    [STATUS_REJECTED]: "بشأن طلب الإجازة الخاص بك",
  };

  await transporter.sendMail({
    from,
    to,
    subject: subjects[status] || "تحديث على طلب الإجازة",
    html,
    attachments: [
      {
        filename: "header.png",
        path: "./assets/themoment-header.png",
        cid: "themoment-header",
      },
    ],
  });

  console.log(`✔ Email sent to ${to} — Status: ${status}`);
}

// ======================================================
// 6) GET EMPLOYEE DATA
// ======================================================

async function getEmployee(nationalId) {
  if (!nationalId) return null;

  const res = await notion.databases.query({
    database_id: EMPLOYEES_DB_ID,
    filter: {
      property: "رقم الهوية",
      rich_text: { equals: String(nationalId) },
    },
    page_size: 1,
  });

  if (res.results.length === 0) return null;

  const page = res.results[0];
  const p = page.properties;

  const name = p["اسم الموظف"]?.title?.[0]?.plain_text || null;
  const email = p["البريد الإلكتروني"]?.email || null;

  const balance =
    p["رصيد الاجازة المستحق"]?.formula?.number ??
    p["رصيد الاجازة المستحق"]?.number ??
    null;

  return { id: page.id, name, email, baseBalance: balance };
}

// ======================================================
// 7) GET USED DAYS
// ======================================================

async function getUsedDays(nationalId) {
  const res = await notion.databases.query({
    database_id: VACATION_DB_ID,
    filter: {
      and: [
        {
          property: "رقم الاحوال/الاقامة",
          number: { equals: Number(nationalId) },
        },
        {
          property: "حالة الطلب",
          select: { equals: STATUS_APPROVED },
        },
      ],
    },
    page_size: 100,
  });

  return res.results.reduce((sum, page) => {
    const days =
      page.properties["الايام الموافق عليها في الطلب الحالي"]?.formula?.number ??
      0;
    return sum + (Number.isFinite(days) ? days : 0);
  }, 0);
}

// ======================================================
// 8) UPDATE EMPLOYEE BALANCE
// ======================================================

async function updateEmployeeBalance(employeeId, remaining) {
  await notion.pages.update({
    page_id: employeeId,
    properties: {
      "رصيد الاجازة المتاح": { number: remaining },
    },
  });
}

// ======================================================
// 9) PROCESS REQUESTS
// ======================================================

async function processVacationRequests() {
  const res = await notion.databases.query({
    database_id: VACATION_DB_ID,
    page_size: 50,
  });

  for (const page of res.results) {
    const pageId = page.id;
    const p = page.properties;

    const nationalId = p["رقم الاحوال/الاقامة"]?.number;
    const statusRaw = p["حالة الطلب"]?.select?.name || null;
    const emailFlag = p[EMAIL_FLAG_PROPERTY]?.rich_text?.[0]?.plain_text || null;

    // ✔ إذا لا توجد حالة → تحويلها إلى "تحت المراجعة"
    let currentStatus = statusRaw;
    if (!currentStatus) {
      currentStatus = STATUS_REVIEW;

      await notion.pages.update({
        page_id: pageId,
        properties: {
          "حالة الطلب": { select: { name: STATUS_REVIEW } },
        },
      });

      console.log(`⚠ تم تعيين حالة الطلب إلى: تحت المراجعة`);
    }

    const employee = await getEmployee(nationalId);
    if (!employee) continue;

    const usedDays = await getUsedDays(nationalId);

    const remainingDays =
      Number.isFinite(employee.baseBalance) &&
      Number.isFinite(usedDays)
        ? employee.baseBalance - usedDays
        : null;

    const startRaw = p["تاريخ بداية الاجازة"]?.date?.start;
    const endRaw =
      p["تاريخ نهاية الاجازة"]?.date?.end ||
      p["تاريخ نهاية الاجازة"]?.date?.start ||
      startRaw;

    const requestedDays =
      p["عدد ايام الاجازة المطلوب"]?.formula?.number || 0;

    await notion.pages.update({
      page_id: pageId,
      properties: {
        "اسم الموظف": {
          title: [{ type: "text", text: { content: employee.name } }],
        },
        "رصيد الاجازة المستحق": { number: employee.baseBalance },
        "عدد الايام المتبقي من الاجازة": { number: remainingDays },
      },
    });

    await updateEmployeeBalance(employee.id, remainingDays);

    // شروط إرسال الإيميل
    const validStatuses = [
      STATUS_REVIEW,
      STATUS_APPROVED,
      STATUS_REJECTED,
    ];

    const cond1 = validStatuses.includes(currentStatus);
    const cond2 = emailFlag !== currentStatus;
    const cond3 = Boolean(employee.email);
    const cond4 = Boolean(startRaw && endRaw);

    const canSend = cond1 && cond2 && cond3 && cond4;

    if (!canSend) {
      console.log("🚫 لن يتم إرسال الإيميل — الشروط غير مكتملة.");
      continue;
    }

    const info = {
      vacationType: p["نوع الاجازة"]?.select?.name || "غير محدد",
      startDate: formatDate(startRaw),
      endDate: formatDate(endRaw),
      days: requestedDays,
      backToWork: formatDate(addOneDay(endRaw)),
    };

    await sendEmail(employee.email, employee.name, info, currentStatus);

    await notion.pages.update({
      page_id: pageId,
      properties: {
        [EMAIL_FLAG_PROPERTY]: {
          rich_text: [{ type: "text", text: { content: currentStatus } }],
        },
      },
    });
  }
}

// ======================================================
// 10) MAIN
// ======================================================

async function main() {
  console.log("🚀 Starting The Moment HR vacation processor...");
  await processVacationRequests();
}

main().catch((err) => console.error("❌ Fatal error:", err.message));
