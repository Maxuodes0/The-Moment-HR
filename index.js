import { Client } from "@notionhq/client";
import nodemailer from "nodemailer";

// --------------------------------------
// إعداد Notion
// --------------------------------------
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const EMPLOYEES_DB_ID = process.env.NOTION_DB_EMPLOYEES;
const VACATION_DB_ID = process.env.VACATION_DB_ID;

const REVIEW_STATUS_NAME = "تحت المراجعة";
const EMAIL_FLAG_PROPERTY = "هل تم ارسال ايميل؟";

// --------------------------------------
// أدوات للتواريخ
// --------------------------------------
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

// --------------------------------------
// قالب الإيميل HTML
// --------------------------------------
function buildVacationRequestHtml({
  employeeName,
  vacationType,
  startDate,
  endDate,
  days,
  backToWork,
}) {
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>إشعار استلام طلب الإجازة - tHe MOMENT</title>
</head>
<body style="margin:0;padding:0;background:#111;font-family:Arial,sans-serif;direction:rtl;text-align:right;">
  <div style="width:100%;padding:20px 0;background:#111;">
    <div style="max-width:650px;margin:0 auto;background:#1a1a1a;border-radius:12px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,0.35);color:#f9f9f9;">
      
      <!-- Header -->
      <div style="background:linear-gradient(90deg,#f2701d,#120704);padding:24px 30px;color:#fff;">
        <div style="font-size:26px;font-weight:bold;letter-spacing:1px;">
          <span style="color:#f2701d;">tHe</span>
          <span style="color:#ffffff;"> MOMENT</span>
        </div>
        <div style="margin-top:8px;font-size:13px;color:#f5d0b5;">
          نظام إدارة الإجازات – إشعار استلام طلب
        </div>
      </div>

      <!-- Content -->
      <div style="padding:26px 30px 30px 30px;background:#151515;">
        <h2 style="margin:0 0 10px;font-size:20px;color:#ffffff;">
          تم استلام طلب الإجازة الخاص بك
        </h2>

        <p style="margin:8px 0;font-size:14px;line-height:1.8;color:#f0f0f0;">
          عزيزي <strong>${employeeName || "الموظف"}</strong>،
        </p>

        <p style="margin:8px 0;font-size:14px;line-height:1.8;color:#f0f0f0;">
          نود إبلاغك بأنه تم استلام طلب الإجازة الذي قمت بتقديمه، وتم تحويل حالته إلى
          <strong>تحت المراجعة</strong> من قبل قسم الموارد البشرية.
        </p>

        <div style="margin-top:22px;font-size:15px;font-weight:bold;color:#f7b07b;">
          تفاصيل الطلب
        </div>

        <div style="margin:10px 0 0;padding:12px 14px;border-radius:8px;background:#1f1f1f;border:1px solid rgba(242,112,29,0.6);font-size:14px;">
          <div style="margin:4px 0;">
            <span style="font-weight:bold;color:#ffd2a3;">نوع الإجازة:</span>
            ${vacationType || "غير محدد"}
          </div>
          <div style="margin:4px 0;">
            <span style="font-weight:bold;color:#ffd2a3;">من تاريخ:</span>
            ${startDate || "غير محدد"}
          </div>
          <div style="margin:4px 0;">
            <span style="font-weight:bold;color:#ffd2a3;">إلى تاريخ:</span>
            ${endDate || "غير محدد"}
          </div>
          <div style="margin:4px 0;">
            <span style="font-weight:bold;color:#ffd2a3;">عدد الأيام:</span>
            ${
              Number.isFinite(days)
                ? days + " أيام"
                : "غير محسوب"
            }
          </div>
          <div style="margin:4px 0;">
            <span style="font-weight:bold;color:#ffd2a3;">تاريخ العودة المتوقع:</span>
            ${backToWork || "سيتم تحديده لاحقاً"}
          </div>
        </div>

        <p style="margin:16px 0 8px;font-size:14px;line-height:1.8;color:#f0f0f0;">
          سيتم إشعارك فور الانتهاء من مراجعة الطلب واعتماده أو طلب أي معلومات إضافية.
        </p>

        <p style="margin:8px 0;font-size:14px;line-height:1.8;color:#f0f0f0;">
          نشكرك على استخدامك نظام tHe MOMENT للموارد البشرية، ونتمنى لك إجازة سعيدة.
        </p>

        <p style="margin-top:20px;font-size:14px;line-height:1.8;color:#f0f0f0;">
          مع خالص التحية،<br/>
          قسم الموارد البشرية – tHe MOMENT
        </p>
      </div>

      <!-- Footer -->
      <div style="padding:14px 30px 18px;background:#111;font-size:11px;color:#aaaaaa;border-top:1px solid #222;">
        هذا البريد أُرسِل تلقائيًا من نظام إدارة الإجازات. في حال وجود استفسار، يرجى التواصل مع قسم الموارد البشرية.
      </div>
    </div>
  </div>
</body>
</html>
`;
}

// --------------------------------------
// إعداد SMTP (Gmail / Workspace)
// --------------------------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// إرسال الإيميل
async function sendEmailToEmployee(toEmail, employeeName, info) {
  if (!toEmail) {
    console.log("⚠ لا يوجد ايميل في الطلب، لن يتم ارسال ايميل.");
    return;
  }

  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;

  const html = buildVacationRequestHtml({
    employeeName,
    vacationType: info.vacationType,
    startDate: info.startDate,
    endDate: info.endDate,
    days: info.days,
    backToWork: info.backToWork,
  });

  const mailOptions = {
    from,
    to: toEmail,
    subject: "تم استلام طلب الإجازة الخاص بك",
    text: `تم استلام طلب الإجازة الخاص بك للفترة من ${info.startDate} إلى ${info.endDate}.`,
    html,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✔ Email sent to ${toEmail}`);
}

// --------------------------------------
// جلب الموظف من Employees DB عن طريق رقم الهوية
// --------------------------------------
async function findEmployeeByNationalId(nationalId) {
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
    const emailProp = page.properties["البريد الإلكتروني"];

    const name =
      nameProp &&
      nameProp.title &&
      nameProp.title[0] &&
      nameProp.title[0].plain_text;

    const email = emailProp?.email || null;

    console.log(
      `✔ Found employee "${name}" (email: ${email || "N/A"}) for رقم الهوية = ${nationalId}`
    );

    return { id: page.id, name, email };
  } catch (err) {
    console.error("❌ Error finding employee:", err.message);
    return null;
  }
}

// --------------------------------------
// معالجة طلبات الإجازة
// --------------------------------------
async function processVacationRequests() {
  if (!VACATION_DB_ID) {
    console.error("❌ VACATION_DB_ID is missing.");
    return;
  }

  console.log("===== Processing vacation requests =====");

  try {
    const response = await notion.databases.query({
      database_id: VACATION_DB_ID,
      page_size: 50, // مبدئياً أول 50 طلب
    });

    console.log(`Found ${response.results.length} vacation requests.\n`);

    for (const page of response.results) {
      const pageId = page.id;
      const props = page.properties;

      const nationalId = props["رقم الاحوال/الاقامة"]?.number;
      const currentStatus = props["حالة الطلب"]?.select?.name || null;
      const vacationEmail = props["الايميل"]?.email || null;

      const emailFlag =
        props[EMAIL_FLAG_PROPERTY]?.rich_text?.[0]?.plain_text || null;

      console.log(
        `\n--- Vacation request ${pageId} ---\n` +
          `رقم الاحوال/الاقامة: ${nationalId ?? "N/A"}\n` +
          `حالة الطلب الحالية: ${currentStatus ?? "غير محددة"}\n` +
          `الايميل في الطلب: ${vacationEmail || "N/A"}\n` +
          `علامة الإيميل الحالية: ${emailFlag || "فارغ"}`
      );

      const needsStatusUpdate = currentStatus !== REVIEW_STATUS_NAME;

      // جلب الموظف
      let employeeName = null;
      let employeeEmail = null;

      if (nationalId) {
        const employee = await findEmployeeByNationalId(nationalId);
        if (employee) {
          employeeName = employee.name;
          employeeEmail = employee.email;
        }
      } else {
        console.log("⚠ لا يوجد رقم احوال/اقامة في هذا الطلب.");
      }

      const finalEmail = vacationEmail || employeeEmail || null;

      // بيانات الإجازة
      const startRaw = props["تاريخ بداية الاجازة"]?.date?.start || null;
      const endRaw =
        props["تاريخ نهاية الاجازة"]?.date?.end ||
        props["تاريخ نهاية الاجازة"]?.date?.start ||
        startRaw;

      const days =
        props["عدد ايام الاجازة المطلوب"]?.formula?.number ?? null;

      const backToWorkRaw = addOneDay(endRaw);

      const vacationInfo = {
        vacationType: props["نوع الاجازة"]?.select?.name || null,
        startDate: formatDate(startRaw),
        endDate: formatDate(endRaw),
        days,
        backToWork: backToWorkRaw ? formatDate(backToWorkRaw) : null,
      };

      // بناء خصائص التحديث (حالة الطلب + اسم الموظف)
      const updateProps = {};

      if (needsStatusUpdate) {
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

      // لو ما في شيء نحدثه ولا راح نرسل ايميل → نكمل على الطلب اللي بعده
      const shouldSendEmail =
        !!finalEmail && emailFlag !== REVIEW_STATUS_NAME;

      if (
        Object.keys(updateProps).length === 0 &&
        !shouldSendEmail
      ) {
        console.log("لا يوجد شيء لتحديثه لهذا الطلب.");
        continue;
      }

      // أولاً: نحدّث حالة الطلب واسم الموظف (لو فيه شيء يتحدّث)
      if (Object.keys(updateProps).length > 0) {
        try {
          await notion.pages.update({
            page_id: pageId,
            properties: updateProps,
          });
          console.log("✔ Updated vacation request (status/name).");
        } catch (err) {
          console.error(
            `❌ Error updating vacation request ${pageId}:`,
            err.message
          );
        }
      }

      // ثانياً: ارسال الايميل لو لازم
      if (shouldSendEmail) {
        try {
          await sendEmailToEmployee(finalEmail, employeeName, vacationInfo);

          // بعد ارسال الإيميل بنجاح، نحدّث علامة الإيميل
          try {
            await notion.pages.update({
              page_id: pageId,
              properties: {
                [EMAIL_FLAG_PROPERTY]: {
                  rich_text: [
                    {
                      type: "text",
                      text: { content: REVIEW_STATUS_NAME },
                    },
                  ],
                },
              },
            });
            console.log("✔ Updated email flag to 'تحت المراجعة'.");
          } catch (err) {
            console.error(
              `❌ Error updating email flag for ${pageId}:`,
              err.message
            );
          }
        } catch (err) {
          console.error("❌ Error sending email:", err.message);
        }
      } else {
        console.log("لن يتم ارسال ايميل لهذا الطلب (إما لا يوجد ايميل أو الإيميل مسبقاً محدث).");
      }
    }
  } catch (err) {
    console.error("❌ Error querying vacation database:", err.message);
  }
}

// --------------------------------------
// Main
// --------------------------------------
async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error("❌ NOTION_TOKEN is missing.");
    return;
  }

  console.log("Starting tHe MOMENT HR vacation processor...");
  await processVacationRequests();
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
});
