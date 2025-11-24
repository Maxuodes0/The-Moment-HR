import { Client } from "@notionhq/client";
import nodemailer from "nodemailer";

// ========================
// إعداد Notion
// ========================

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const EMPLOYEES_DB_ID = process.env.NOTION_DB_EMPLOYEES;
const VACATION_DB_ID = process.env.VACATION_DB_ID;

const REVIEW_STATUS_NAME = "تحت المراجعة";
const EMAIL_FLAG_PROPERTY = "هل تم ارسال ايميل؟";

// ========================
// توابع مساعدة للتواريخ
// ========================

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

// ========================
// قالب HTML للإيميل (تصميم The Moment)
// ========================

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
    <title>إشعار استلام طلب الإجازة - The Moment</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0; padding:0; background-color:#000000; font-family:Arial,Helvetica,sans-serif; direction:rtl; text-align:right;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#000000;">
      <tr>
        <td align="center">
          <table width="600" border="0" cellspacing="0" cellpadding="0" style="width:600px; max-width:100%; background-color:#000000;">

            <!-- الهيدر بالصورة -->
            <tr>
              <td align="center" style="padding:0; margin:0;">
                <img
                  src="cid:themoment-header"
                  alt="The Moment"
                  style="display:block; width:100%; max-width:600px; height:auto; border:0; line-height:0; font-size:0;"
                />
              </td>
            </tr>

            <!-- المحتوى -->
            <tr>
              <td style="padding:24px; color:#ffffff; text-align:right;">
                <h1 style="margin:0 0 12px 0; font-size:22px; font-weight:bold;">
                  تم استلام طلب الإجازة الخاص بك
                </h1>

                <p style="font-size:14px; line-height:1.8; color:#f2f2f2; margin:0 0 8px 0;">
                  عزيزي <strong>${employeeName || "الموظف"}</strong>،
                </p>

                <p style="font-size:14px; line-height:1.8; color:#f2f2f2; margin:0 0 16px 0;">
                  نود إبلاغك بأنه تم استلام طلب الإجازة الذي قمت بتقديمه، وحالته 
                  <strong>تحت المراجعة</strong> من قبل فريق الموارد البشرية في
                  <strong>The Moment</strong>.
                </p>

                <div style="margin:16px 0 10px 0; font-size:15px; font-weight:bold; color:#ffb37a;">
                  تفاصيل الطلب:
                </div>

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:13px; line-height:1.7; color:#f2f2f2;">
                  <tr>
                    <td style="padding:4px 0; width:35%; font-weight:bold; color:#ffd2a3;">
                      نوع الإجازة:
                    </td>
                    <td style="padding:4px 0;">
                      ${vacationType || "غير محدد"}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0; font-weight:bold; color:#ffd2a3;">
                      من تاريخ:
                    </td>
                    <td style="padding:4px 0;">
                      ${startDate || "غير محدد"}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0; font-weight:bold; color:#ffd2a3;">
                      إلى تاريخ:
                    </td>
                    <td style="padding:4px 0;">
                      ${endDate || "غير محدد"}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0; font-weight:bold; color:#ffd2a3;">
                      عدد الأيام:
                    </td>
                    <td style="padding:4px 0;">
                      ${
                        Number.isFinite(days)
                          ? days + " يوم"
                          : "غير محسوب"
                      }
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0; font-weight:bold; color:#ffd2a3;">
                      تاريخ العودة المتوقع:
                    </td>
                    <td style="padding:4px 0;">
                      ${backToWork || "سيتم تحديده لاحقاً"}
                    </td>
                  </tr>
                </table>

                <p style="font-size:13px; line-height:1.8; color:#f2f2f2; margin:16px 0 8px 0;">
                  سيتم مراجعة طلبك بكل عناية، وسيتم الرد عليك بتحديث الحالة عبر البريد الإلكتروني فور اتخاذ القرار. نشكرك على لطفك وتفهمك.
                </p>

                <p style="font-size:13px; line-height:1.8; color:#f2f2f2; margin:0 0 4px 0;">
                  في حال وجود أي استفسارات إضافية، يمكنك التواصل مع قسم الموارد البشرية.
                </p>

                <p style="font-size:13px; line-height:1.8; color:#f2f2f2; margin:16px 0 0 0;">
                  مع خالص التحية،<br/>
                  فريق الموارد البشرية – The Moment
                </p>
              </td>
            </tr>

            <!-- الفوتر -->
            <tr>
              <td style="padding:16px 24px 24px 24px; font-size:11px; line-height:1.5; color:#aaaaaa; text-align:right; border-top:1px solid #333;">
                © The Moment. جميع الحقوق محفوظة.<br/>
                هذا البريد أُرسِل تلقائيًا من نظام إدارة الإجازات. في حال وجود استفسار، يرجى التواصل مع قسم الموارد البشرية.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

// ========================
// إعداد SMTP (لازم يجي قبل sendEmailToEmployee)
// ========================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ========================
// إرسال الإيميل
// ========================

async function sendEmailToEmployee(toEmail, employeeName, info) {
  if (!toEmail) {
    console.log("⚠ لا يوجد ايميل في الطلب، لن يتم ارسال ايميل.");
    return;
  }
  if (!employeeName) {
    console.log("⚠ لا يوجد اسم موظف، لن يتم ارسال ايميل.");
    return;
  }
  if (!info.startDate || !info.endDate) {
    console.log("⚠ تواريخ الإجازة ناقصة، لن يتم ارسال ايميل.");
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
    attachments: [
      {
        filename: "themoment-header.png",
        path: "./assets/themoment-header.png",
        cid: "themoment-header",
      },
    ],
  };

  await transporter.sendMail(mailOptions);
  console.log(`✔ Email sent to ${toEmail}`);
}

// ========================
// جلب الموظف من Employees DB عن طريق رقم الهوية
// ========================

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

// ========================
// معالجة طلبات الإجازة
// ========================

async function processVacationRequests() {
  if (!VACATION_DB_ID) {
    console.error("❌ VACATION_DB_ID is missing.");
    return;
  }

  console.log("===== Processing vacation requests =====");

  try {
    const response = await notion.databases.query({
      database_id: VACATION_DB_ID,
      page_size: 50,
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

      // جلب بيانات الموظف
      let employeeName = null;
      let employeeEmail = null;

      if (nationalId) {
        const employee = await findEmployeeByNationalId(nationalId);
        if (employee) {
          employeeName = employee.name;
          employeeEmail = employee.email;
        }
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

      // تجهيز تحديث حالة الطلب واسم الموظف
      const updateProps = {};

      if (currentStatus !== REVIEW_STATUS_NAME) {
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

      // نرسل ايميل فقط إذا:
      // - ما سبق وأرسلنا لنفس الحالة (emailFlag !== REVIEW_STATUS_NAME)
      // - وفيه ايميل واسم وتواريخ
      const shouldSendEmail =
        emailFlag !== REVIEW_STATUS_NAME &&
        !!finalEmail &&
        !!employeeName &&
        !!startRaw &&
        !!endRaw;

      if (!shouldSendEmail) {
        console.log(
          "لن يتم ارسال ايميل لهذا الطلب (الشروط غير مكتملة أو تم الإرسال سابقاً)."
        );
        continue;
      }

      try {
        await sendEmailToEmployee(finalEmail, employeeName, vacationInfo);

        // تحديث علامة الإيميل بعد الإرسال
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
          "❌ Error sending email or updating email flag:",
          err.message
        );
      }
    }
  } catch (err) {
    console.error("❌ Error querying vacation database:", err.message);
  }
}

// ========================
// Main
// ========================

async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error("❌ NOTION_TOKEN is missing.");
    return;
  }

  console.log("Starting The Moment HR vacation processor...");
  await processVacationRequests();
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
});
