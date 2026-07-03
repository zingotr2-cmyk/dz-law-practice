import { NextResponse } from "next/server";
import { Resend } from "resend";
import nodemailer from "nodemailer";

// Helper to mask sensitive keys for safe display in diagnostic logs
function maskKey(key: string | undefined): string {
  if (!key) return "لم يتم العثور على المفتاح / NOT_FOUND";
  if (key.length <= 8) return "***";
  return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
}

export async function GET(req: Request) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {
      RESEND_API_KEY_PRESENT: !!process.env.RESEND_API_KEY,
      RESEND_API_KEY_MASKED: maskKey(process.env.RESEND_API_KEY),
      SMTP_HOST: process.env.SMTP_HOST || "غير محدد / NOT_SET",
      SMTP_PORT: process.env.SMTP_PORT || "غير محدد / NOT_SET",
      SMTP_USER: process.env.SMTP_USER || "غير محدد / NOT_SET",
      SMTP_PASS_PRESENT: !!process.env.SMTP_PASS,
    },
    resendResult: null,
    smtpResult: null,
    overallStatus: "UNKNOWN",
  };

  const { searchParams } = new URL(req.url);
  const testEmailRecipient = searchParams.get("email") || "test@niklinx.dz";

  console.log(`🔍 [DIAGNOSTICS] Starting email delivery test to: ${testEmailRecipient}`);

  // 1. Attempt Primary Dispatch (Resend SDK)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      console.log("🚀 [DIAGNOSTICS] Attempting primary email dispatch via Resend API...");
      const resend = new Resend(resendKey);
      
      const response = await resend.emails.send({
        from: "منصة المحامين <noreply@niklinx.dz>", // Make sure domain is verified on Resend, or use "onboarding@resend.dev"
        to: [testEmailRecipient],
        subject: "📡 اختبار اتصال بريد المنصة - الأستاذ إبراهيم منصوري",
        html: `
          <div dir="rtl" style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1a2232;">اختبار نظام البريد الإلكتروني (Resend SDK)</h2>
            <p>لقد تم إرسال هذه الرسالة لاختبار تكامل خادم الرسائل للمنصة السحابية.</p>
            <p style="font-size: 12px; color: #64748b;">تطوير وإدارة: NikLinx LLC</p>
          </div>
        `,
      });

      console.log("✅ [DIAGNOSTICS] Resend API Raw Response:", response);
      
      if (response.error) {
        throw response.error;
      }

      diagnostics.resendResult = {
        success: true,
        data: response.data,
        message: "تم الإرسال بنجاح عبر Resend SDK!",
      };
      diagnostics.overallStatus = "SUCCESS_RESEND";

    } catch (error: any) {
      console.error("❌ [DIAGNOSTICS] Resend API Failed. Root Error Details:", error);
      
      let specificReason = "خطأ غير معروف في الاتصال بـ Resend";
      if (error.name === "validation_error") {
        specificReason = "خطأ في التحقق من البيانات (مثال: البريد المرسل منه غير موثق في حساب Resend لديك).";
      } else if (error.message?.includes("API key")) {
        specificReason = "مفتاح Resend API Key غير صالح أو انتهت صلاحيته.";
      } else if (error.statusCode === 429) {
        specificReason = "تم تجاوز الحد الأقصى للإرسال المسموح به (Rate Limit Exceeded).";
      } else if (error.message) {
        specificReason = error.message;
      }

      diagnostics.resendResult = {
        success: false,
        errorName: error.name || "Error",
        errorMessage: error.message || String(error),
        statusCode: error.statusCode,
        diagnosis: specificReason,
      };
    }
  } else {
    console.warn("⚠️ [DIAGNOSTICS] Resend Key is missing. Skipping Resend test.");
    diagnostics.resendResult = {
      success: false,
      diagnosis: "RESEND_API_KEY غير معرف في ملف البيئة .env",
    };
  }

  // 2. Attempt Fallback Dispatch (NodeMailer SMTP) if Resend failed or is unconfigured
  if (diagnostics.overallStatus !== "SUCCESS_RESEND") {
    console.log("🔄 [DIAGNOSTICS] Resend is unavailable or failed. Initiating fallback test via NodeMailer SMTP...");
    
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort || "587"),
          secure: smtpPort === "465", // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          timeout: 10000, // 10s connection timeout
        });

        // Verify connection configuration
        await transporter.verify();
        console.log("🔌 [DIAGNOSTICS] NodeMailer SMTP connection verified successfully.");

        const mailOptions = {
          from: `"منصة المحامين السحابية" <${smtpUser}>`,
          to: testEmailRecipient,
          subject: "📡 اختبار اتصال بريد المنصة الاحتياطي (NodeMailer SMTP)",
          html: `
            <div dir="rtl" style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1a2232;">اختبار خادم البريد الاحتياطي (NodeMailer SMTP)</h2>
              <p>مرحباً، تم إرسال هذا البريد عبر النظام الاحتياطي للمنصة السحابية لضمان وصول أكواد التحقق دون انقطاع.</p>
              <p style="font-size: 12px; color: #64748b;">تطوير وإدارة: NikLinx LLC</p>
            </div>
          `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("✅ [DIAGNOSTICS] NodeMailer SMTP send response:", info);

        diagnostics.smtpResult = {
          success: true,
          messageId: info.messageId,
          response: info.response,
        };
        diagnostics.overallStatus = "SUCCESS_SMTP";

      } catch (smtpError: any) {
        console.error("❌ [DIAGNOSTICS] SMTP Fallback Delivery Failed:", smtpError);
        diagnostics.smtpResult = {
          success: false,
          errorMessage: smtpError.message || String(smtpError),
          code: smtpError.code,
          diagnosis: "فشل الاتصال بالخادم السحابي لـ SMTP. يرجى التحقق من صحة المنفذ Port أو اسم النطاق وكلمة المرور الخاصة بـ cPanel.",
        };
        diagnostics.overallStatus = "FAILED_ALL";
      }
    } else {
      console.warn("⚠️ [DIAGNOSTICS] SMTP credentials missing. Cannot attempt fallback.");
      diagnostics.smtpResult = {
        success: false,
        diagnosis: "بيانات خادم SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) غير معرّفة بالكامل في ملف .env",
      };
      diagnostics.overallStatus = "FAILED_NO_SMTP_CREDS";
    }
  }

  // 3. Return report
  const isHealthy = diagnostics.overallStatus.startsWith("SUCCESS");
  return NextResponse.json(
    {
      healthy: isHealthy,
      diagnostics,
      instructions: {
        arabic: [
          "في حال فشل الإرسال عبر Resend: يرجى التأكد من توثيق النطاق الخاص بك (Domain Verification) على لوحة Resend أو تفعيل الإرسال التجريبي إلى بريدك الشخصي فقط.",
          "في حال الرغبة بالاعتماد على خادم بريد مخصص: يرجى إضافة قيم البيئة التالية في ملف .env الخاص بك: SMTP_HOST و SMTP_PORT و SMTP_USER و SMTP_PASS وسيقوم النظام بالتحول تلقائياً إليها كخطة احتياطية."
        ],
        english: [
          "If Resend fails, verify that you have added and verified your sending domain on resend.com, or use the default onboarding address with your verified account email.",
          "To use custom mail SMTP, specify SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS inside your environment configuration."
        ]
      }
    },
    { status: isHealthy ? 200 : 500 }
  );
}
