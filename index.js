import { Client } from "@notionhq/client";
import nodemailer from "nodemailer";

// ============================================
// إعداد Notion
// ============================================
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const EMPLOYEES_DB_ID = process.env.NOTION_DB_EMPLOYEES;
const VACATION_DB_ID = process.env.VACATION_DB_ID;

const REVIEW_STATUS_NAME = "تحت المراجعة";
const EMAIL_FLAG_PROPERTY = "هل تم ارسال ايميل؟";

// ============================================
// أدوات للتواريخ
// ============================================
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

// ============================================
// قالب الإيميل HTML محسّن للموبايل والويب
// ============================================
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>إشعار استلام طلب الإجازة - tHe MOMENT</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 100%;
      height: 100%;
    }

    body {
      background: #120704;
      font-family: 'Segoe UI', 'Arial', sans-serif;
      direction: rtl;
      text-align: right;
      padding: 16px;
      min-height: 100vh;
      line-height: 1.6;
    }

    .container {
      max-width: 650px;
      width: 100%;
      margin: 0 auto;
    }

    .email-wrapper {
      background: #0a0a0a;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(242, 112, 29, 0.2);
    }

    /* =========== Header =========== */
    .header {
      background: #f2701d;
      padding: 48px 24px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      width: 250px;
      height: 250px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      top: -80px;
      right: -80px;
    }

    .header-content {
      position: relative;
      z-index: 1;
    }

    .logo {
      font-size: 44px;
      font-weight: 900;
      letter-spacing: 1.5px;
      margin-bottom: 12px;
      line-height: 1.2;
    }

    .logo .the {
      color: #ffffff;
      font-style: italic;
      font-weight: 800;
    }

    .logo .moment {
      color: #ffffff;
      font-weight: 900;
      letter-spacing: 2px;
      display: block;
      font-size: 48px;
    }

    .logo-accent {
      width: 60px;
      height: 4px;
      background: #f2701d;
      margin: 10px auto;
      border-radius: 2px;
    }

    .subtitle {
      font-size: 13px;
      color: #ffd2a3;
      letter-spacing: 0.8px;
      font-weight: 500;
    }

    /* =========== Content =========== */
    .content {
      padding: 40px 24px;
      background: #0f0f0f;
    }

    .status-badge {
      display: inline-block;
      background: rgba(242, 112, 29, 0.15);
      border: 2px solid #f2701d;
      color: #f2701d;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 20px;
      letter-spacing: 0.5px;
    }

    .greeting {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .greeting .emoji {
      margin-left: 8px;
      font-size: 24px;
    }

    .message {
      font-size: 15px;
      color: #d0d0d0;
      line-height: 1.8;
      margin-bottom: 16px;
      text-align: justify;
    }

    .highlight {
      color: #f2701d;
      font-weight: 700;
    }

    .details-section {
      margin-top: 30px;
      margin-bottom: 20px;
    }

    .details-title {
      font-size: 15px;
      font-weight: 700;
      color: #f2701d;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .details-title::before {
      content: '◆';
      font-size: 10px;
      display: inline-block;
    }

    .details-box {
      background: rgba(242, 112, 29, 0.1);
      border: 2px solid #f2701d;
      border-radius: 10px;
      padding: 18px;
      margin-bottom: 20px;
      overflow: hidden;
    }

    .detail-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(242, 112, 29, 0.15);
      align-items: center;
    }

    .detail-row:last-child {
      border-bottom: none;
      padding-bottom: 8px;
    }

    .detail-row:first-child {
      padding-top: 0;
    }

    .detail-label {
      font-weight: 700;
      color: #ffb87d;
      font-size: 13px;
    }

    .detail-value {
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      word-break: break-word;
    }

    .closing-message {
      font-size: 14px;
      color: #d0d0d0;
      line-height: 1.8;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid rgba(242, 112, 29, 0.2);
    }

    .signature {
      font-size: 13px;
      color: #ffb87d;
      margin-top: 24px;
      padding-top: 15px;
      border-top: 1px solid rgba(242, 112, 29, 0.25);
      font-weight: 500;
      line-height: 1.8;
    }

    .signature strong {
      display: block;
      color: #f2701d;
      font-weight: 700;
      margin-top: 8px;
    }

    /* =========== Footer =========== */
    .footer {
      background: #000000;
      padding: 16px 24px;
      font-size: 11px;
      color: #777777;
      border-top: 1px solid rgba(242, 112, 29, 0.2);
      text-align: center;
      line-height: 1.6;
    }

    /* =========== Mobile Responsive =========== */
    @media (max-width: 600px) {
      body {
        padding: 12px;
        font-size: 14px;
      }

      .email-wrapper {
        border-radius: 10px;
      }

      .header {
        padding: 32px 16px;
      }

      .header::before {
        width: 180px;
        height: 180px;
        top: -60px;
        right: -60px;
      }

      .logo {
        font-size: 36px;
        letter-spacing: 1px;
      }

      .logo .moment {
        font-size: 40px;
        letter-spacing: 1.5px;
      }

      .logo-accent {
        width: 50px;
        height: 3px;
      }

      .subtitle {
        font-size: 12px;
      }

      .content {
        padding: 28px 16px;
      }

      .greeting {
        font-size: 18px;
        margin-bottom: 16px;
      }

      .greeting .emoji {
        font-size: 20px;
      }

      .message {
        font-size: 14px;
        line-height: 1.7;
        margin-bottom: 14px;
      }

      .details-title {
        font-size: 14px;
        margin-bottom: 12px;
      }

      .details-box {
        padding: 14px;
        margin-bottom: 16px;
      }

      .detail-row {
        grid-template-columns: 1fr;
        gap: 4px;
        padding: 10px 0;
      }

      .detail-label {
        font-size: 12px;
        color: #ffb87d;
      }

      .detail-value {
        font-size: 13px;
        color: #ffffff;
        margin-top: 2px;
      }

      .closing-message {
        font-size: 13px;
        margin-top: 16px;
        padding-top: 12px;
      }

      .signature {
        font-size: 12px;
        margin-top: 18px;
        padding-top: 12px;
      }

      .footer {
        padding: 12px 16px;
        font-size: 10px;
      }

      .status-badge {
        font-size: 11px;
        padding: 6px 12px;
      }
    }

    @media (max-width: 480px) {
      .header {
        padding: 24px 12px;
      }

      .logo {
        font-size: 28px;
      }

      .logo .moment {
        font-size: 32px;
      }

      .content {
        padding: 20px 12px;
      }

      .greeting {
        font-size: 16px;
      }

      .message {
        font-size: 13px;
      }

      .details-box {
        padding: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <!-- ========== Header ========== -->
      <div class="header">
        <div class="header-content">
          <div class="logo">
            <span class="the">tHe</span>
            <span class="moment">MOMENT</span>
          </div>
          <div class="logo-accent"></div>
          <div class="subtitle">نظام إدارة الموارد البشرية</div>
        </div>
      </div>

      <!-- ========== Content ========== -->
      <div class="content">
        <!-- Status Badge -->
        <div class="status-badge">✓ تم الاستلام</div>

        <!-- Greeting -->
        <div class="greeting">
          <span class="emoji">👋</span>مرحباً بك
        </div>

        <!-- Main Message -->
        <div class="message">
          عزيزي <strong>${employeeName || "الموظف"}</strong>،
        </div>

        <div class="message">
          شكراً لاستخدامك نظام tHe MOMENT. تم <span class="highlight">استلام طلب الإجازة الخاص بك بنجاح</span> وتم تحويل حالته إلى <span class="highlight">تحت المراجعة</span> من قبل قسم الموارد البشرية.
        </div>

        <!-- Details Section -->
        <div class="details-section">
          <div class="details-title">📋 تفاصيل الطلب</div>
          <div class="details-box">
            <div class="detail-row">
              <div class="detail-label">نوع الإجازة</div>
              <div class="detail-value">${vacationType || "غير محدد"}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">تاريخ البداية</div>
              <div class="detail-value">${startDate || "غير محدد"}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">تاريخ النهاية</div>
              <div class="detail-value">${endDate || "غير محدد"}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">عدد الأيام</div>
              <div class="detail-value">${
                Number.isFinite(days)
                  ? days + " أيام"
                  : "غير محسوب"
              }</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">تاريخ العودة المتوقع</div>
              <div class="detail-value">${backToWork || "سيتم تحديده"}</div>
            </div>
          </div>
        </div>

        <!-- Closing Message -->
        <div class="closing-message">
          <strong>سيتم إشعارك فور الانتهاء من مراجعة الطلب</strong> واعتماده أو طلب أي معلومات إضافية من قبل فريقنا.
        </div>

        <div class="closing-message" style="border-top: none; padding-top: 0; margin-top: 12px;">
          نتمنى لك إجازة سعيدة وممتعة. 🌴
        </div>

        <!-- Signature -->
        <div class="signature">
          مع خالص التحية،<br/>
          <strong>قسم الموارد البشرية</strong>
          tHe MOMENT HR Team
        </div>
      </div>

      <!-- ========== Footer ========== -->
      <div class="footer">
        هذا البريد أُرسِل تلقائيًا من نظام إدارة الإجازات. في حال وجود استفسار أو مشكلة، يرجى التواصل مع قسم الموارد البشرية.
      </div>
    </div>
  </div>
</body>
</html>
`;
}

// ============================================
// إعداد SMTP (Gmail / Workspace)
// ============================================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ============================================
// إرسال الإيميل
// ============================================
async function sendEmailToEmployee(toEmail, employeeName, info) {
  if (!toEmail) {
    console.log("⚠ لا يوجد ايميل في الطلب، لن يتم ارسال ايميل.");
    return false;
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
    subject: "✓ تم استلام طلب الإجازة الخاص بك - tHe MOMENT",
    text: `تم استلام طلب الإجازة الخاص بك للفترة من ${info.startDate} إلى ${info.endDate}.`,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✔ Email sent successfully to ${toEmail}`);
    return true;
  } catch (err) {
    console.error(`❌ Error sending email to ${toEmail}:`, err.message);
    return false;
  }
}

// ============================================
// جلب الموظف من Employees DB عن طريق رقم الهوية
// ============================================
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
      console.log(`⚠ No employee found with رقم الهوية = ${nationalId}`);
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
      `✔ Found employee: "${name}" (Email: ${email || "N/A"}) for ID: ${nationalId}`
    );

    return { id: page.id, name, email };
  } catch (err) {
    console.error("❌ Error finding employee:", err.message);
    return null;
  }
}

// ============================================
// معالجة طلبات الإجازة
// ============================================
async function processVacationRequests() {
  if (!VACATION_DB_ID) {
    console.error("❌ VACATION_DB_ID is missing.");
    return;
  }

  console.log("🚀 Starting vacation request processing...\n");

  try {
    const response = await notion.databases.query({
      database_id: VACATION_DB_ID,
      page_size: 50,
    });

    console.log(`📊 Found ${response.results.length} vacation requests.\n`);

    if (response.results.length === 0) {
      console.log("✓ No vacation requests to process.\n");
      return;
    }

    let processed = 0;
    let emailsSent = 0;
    let errors = 0;

    for (const page of response.results) {
      try {
        const pageId = page.id;
        const props = page.properties;

        const nationalId = props["رقم الاحوال/الاقامة"]?.number;
        const currentStatus = props["حالة الطلب"]?.select?.name || null;
        const vacationEmail = props["الايميل"]?.email || null;
        const emailFlag = props[EMAIL_FLAG_PROPERTY]?.rich_text?.[0]?.plain_text || null;

        console.log(`\n📝 Processing Request ID: ${pageId}`);
        console.log(`   National ID: ${nationalId || "N/A"}`);
        console.log(`   Current Status: ${currentStatus || "Not Set"}`);
        console.log(`   Email: ${vacationEmail || "N/A"}`);
        console.log(`   Email Flag: ${emailFlag || "Empty"}`);

        const needsStatusUpdate = currentStatus !== REVIEW_STATUS_NAME;

        // جلب بيانات الموظف
        let employeeName = null;
        let employeeEmail = null;

        if (nationalId) {
          const employee = await findEmployeeByNationalId(nationalId);
          if (employee) {
            employeeName = employee.name;
            employeeEmail = employee.email;
          }
        } else {
          console.log("   ⚠ No National ID provided.");
        }

        const finalEmail = vacationEmail || employeeEmail || null;

        // جلب بيانات الإجازة
        const startRaw = props["تاريخ بداية الاجازة"]?.date?.start || null;
        const endRaw =
          props["تاريخ نهاية الاجازة"]?.date?.end ||
          props["تاريخ نهاية الاجازة"]?.date?.start ||
          startRaw;

        const days = props["عدد ايام الاجازة المطلوب"]?.formula?.number ?? null;
        const backToWorkRaw = addOneDay(endRaw);

        const vacationInfo = {
          vacationType: props["نوع الاجازة"]?.select?.name || null,
          startDate: formatDate(startRaw),
          endDate: formatDate(endRaw),
          days,
          backToWork: backToWorkRaw ? formatDate(backToWorkRaw) : null,
        };

        // بناء خصائص التحديث
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

        const shouldSendEmail =
          !!finalEmail && emailFlag !== REVIEW_STATUS_NAME;

        if (Object.keys(updateProps).length === 0 && !shouldSendEmail) {
          console.log("   ℹ Nothing to update for this request.");
          continue;
        }

        // تحديث حالة الطلب واسم الموظف
        if (Object.keys(updateProps).length > 0) {
          try {
            await notion.pages.update({
              page_id: pageId,
              properties: updateProps,
            });
            console.log("   ✔ Updated request status and employee name");
          } catch (err) {
            console.error(`   ❌ Error updating request:`, err.message);
            errors++;
          }
        }

        // إرسال الإيميل
        if (shouldSendEmail) {
          const emailSent = await sendEmailToEmployee(
            finalEmail,
            employeeName,
            vacationInfo
          );

          if (emailSent) {
            emailsSent++;

            // تحديث علامة الإيميل
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
              console.log("   ✔ Email flag updated");
            } catch (err) {
              console.error(`   ❌ Error updating email flag:`, err.message);
            }
          } else {
            errors++;
          }
        } else {
          console.log(
            "   ℹ Email not sent (already sent or no email address)"
          );
        }

        processed++;
      } catch (err) {
        console.error(`   ❌ Error processing request:`, err.message);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📈 Processing Summary:");
    console.log(`   ✔ Processed: ${processed}`);
    console.log(`   ✉️  Emails Sent: ${emailsSent}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log("=".repeat(50) + "\n");
  } catch (err) {
    console.error("❌ Error querying vacation database:", err.message);
  }
}

// ============================================
// Main Function
// ============================================
async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error("❌ NOTION_TOKEN is missing in environment variables.");
    process.exit(1);
  }

  if (!EMPLOYEES_DB_ID) {
    console.error("❌ NOTION_DB_EMPLOYEES is missing in environment variables.");
    process.exit(1);
  }

  if (!VACATION_DB_ID) {
    console.error("❌ VACATION_DB_ID is missing in environment variables.");
    process.exit(1);
  }

  console.log("🎯 tHe MOMENT HR Vacation System Starting...\n");

  try {
    await processVacationRequests();
    console.log("✅ Process completed successfully!");
  } catch (err) {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  }
}

// Run the main function
main();
