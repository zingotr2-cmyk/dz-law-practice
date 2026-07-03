import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Initialize Resend SDK lazily
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY is not defined. Resend dispatch will be skipped.");
    return null;
  }
  return new Resend(apiKey);
};

/**
 * Helper function to send Verification Code with fallback mechanism.
 * First, it attempts using Resend API. If it fails or is unconfigured,
 * it falls back to custom SMTP settings via NodeMailer.
 */
async function sendVerificationEmail(
  email: string,
  name: string,
  otpCode: string
): Promise<{ success: boolean; provider: string; errorDetails?: string }> {
  const resend = getResendClient();
  const emailHtml = `
    <div dir="rtl" style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0f172a; border-radius: 16px; color: #f8fafc; text-align: right;">
      <div style="text-align: center; border-b: 1px solid rgba(226, 135, 67, 0.2); padding-bottom: 25px; margin-bottom: 30px;">
        <h1 style="color: #ffffff; font-size: 26px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">تأكيد حسابك في المكتب القضائي - NikLinx</h1>
        <p style="color: #e28743; font-size: 14px; font-weight: 700; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">النظام السحابي لإدارة الممارسات القانونية</p>
      </div>
      
      <div style="background-color: #1e293b; border: 1px solid rgba(226, 135, 67, 0.15); border-radius: 12px; padding: 30px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
        <p style="font-size: 18px; color: #f1f5f9; margin-top: 0; font-weight: 600;">مرحباً بالأستاذ(ة) <strong>${name}</strong>،</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.8; margin-bottom: 25px;">لقد تلقينا طلباً لتسجيل حسابك الجديد في منصتنا الرقمية. لتوثيق ملكية البريد الإلكتروني وتنشيط مكتبك السحابي بأمان، يرجى استخدام الرمز السري المؤقت التالي:</p>
        
        <div style="display: inline-block; background-color: #0f172a; color: #e28743; font-size: 38px; font-weight: 900; letter-spacing: 8px; padding: 18px 45px; border-radius: 12px; margin: 10px 0 25px 0; border: 2px solid #e28743; box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);">
          ${otpCode}
        </div>
        
        <div style="background-color: rgba(226, 135, 67, 0.1); border-right: 4px solid #e28743; padding: 12px 15px; border-radius: 4px; text-align: right; margin-bottom: 5px;">
          <p style="font-size: 13px; color: #e28743; margin: 0; font-weight: bold; line-height: 1.6;">
            ⚠️ تنبيه أمني هام: هذا الرمز صالح للاستخدام لمرة واحدة فقط وينتهي بعد 5 دقائق من وقت الإرسال لحماية خصوصية بياناتك القانونية.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; color: #64748b; font-size: 12px; margin-top: 35px; border-top: 1px solid #1e293b; padding-top: 20px; line-height: 1.6;">
        هذا البريد تم إرساله آلياً من أنظمة التوثيق المؤمنة للمكتب القضائي.<br/>
        تطوير وإدارة عمليات سحابية: <strong>NikLinx LLC</strong> © 2026
      </div>
    </div>
  `;

  // --- PATH A: Try Resend ---
  if (resend) {
    try {
      console.log("🚀 [EMAIL] Attempting primary email dispatch via Resend SDK...");
      const response = await resend.emails.send({
        from: "المكتب القضائي <no-reply@niklinx.com>",
        to: [email],
        subject: `تأكيد حسابك في المكتب القضائي - كود التوثيق الخاص بك: ${otpCode}`,
        html: emailHtml,
      });

      if (response.error) {
        console.error("❌ [EMAIL-DIAGNOSTICS] Resend returned an error response:", response.error);
        throw response.error;
      }

      console.log("✅ [EMAIL] Successfully sent OTP via Resend SDK.", response.data);
      return { success: true, provider: "Resend" };
    } catch (resendError: any) {
      console.error("❌ [EMAIL-DIAGNOSTICS] Resend Primary Dispatch failed. Error Class/Msg:", resendError);
      
      // Analyze the error type to log specific insights
      if (resendError.statusCode === 403 || resendError.name === "validation_error") {
        console.warn("💡 [DIAGNOSTIC HINT] 403 / Validation Error often indicates unverified sender domain on Resend. Ensure domain dns is verified.");
      } else if (resendError.statusCode === 429) {
        console.warn("💡 [DIAGNOSTIC HINT] Rate limit reached on your Resend free-tier account.");
      }
    }
  }

  // --- PATH B: Fallback to NodeMailer SMTP ---
  console.log("🔄 [EMAIL] Attempting secondary fallback mail dispatch via NodeMailer SMTP...");
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || "587"),
        secure: smtpPort === "465", // true for port 465, false for 587
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        timeout: 8000, // 8 seconds timeout
      });

      const mailOptions = {
        from: `"المكتب القضائي" <${smtpUser}>`,
        to: email,
        subject: `تأكيد حسابك في المكتب القضائي - كود التوثيق الخاص بك: ${otpCode}`,
        html: emailHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ [EMAIL] Successfully sent OTP via NodeMailer SMTP fallback.", info.messageId);
      return { success: true, provider: "SMTP" };
    } catch (smtpError: any) {
      console.error("❌ [EMAIL-DIAGNOSTICS] SMTP Fallback failed as well. Error details:", smtpError);
      return {
        success: false,
        provider: "None",
        errorDetails: `SMTP Error: ${smtpError.message || String(smtpError)}`,
      };
    }
  } else {
    console.warn("⚠️ [EMAIL] SMTP Configuration is missing in environment variables. Fallback bypassed.");
    return {
      success: false,
      provider: "None",
      errorDetails: "Resend failed and NodeMailer SMTP is not configured in .env",
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, region, phone } = body;

    // 1. Inputs Validation
    if (!name || !email || !password || !region || !phone) {
      return NextResponse.json(
        { error: "جميع الحقول مطلوبة لإتمام عملية التسجيل." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "البريد الإلكتروني المدخل غير صالح." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "يجب أن تكون كلمة المرور مكونة من 6 أحرف أو أرقام على الأقل." },
        { status: 400 }
      );
    }

    // 2. Check if user already exists
    const existingLawyer = await prisma.lawyer.findUnique({
      where: { email },
    });

    if (existingLawyer) {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني مسجل بالفعل بالمنصة." },
        { status: 409 } // Conflict
      );
    }

    // 3. Hash password securely
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Create Lawyer record as PENDING_EMAIL
    const newLawyer = await prisma.lawyer.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        region,
        status: "PENDING_EMAIL",
        currentPlan: "FREE",
        remainingFreeCases: 3,
      },
    });

    // 5. Generate secure random 6-digit OTP using Cryptographically Secure Pseudo-Random Number Generator (CSPRNG)
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Expires in 5 minutes

    // Store OTP in the database
    await prisma.oTP.create({
      data: {
        email,
        code: otpCode,
        expiresAt,
      },
    });

    // 6. Send Email using our resilient wrapper with automatic fallback
    const emailDispatch = await sendVerificationEmail(email, name, otpCode);

    if (!emailDispatch.success) {
      // Clean up the created lawyer and OTP so registration can be retried fresh
      console.warn("🧹 [CLEANUP] Cleaning up created lawyer record due to absolute email dispatch failure...");
      try {
        await prisma.oTP.deleteMany({ where: { email } });
        await prisma.lawyer.delete({ where: { id: newLawyer.id } });
      } catch (cleanupErr) {
        console.error("❌ Cleanup error:", cleanupErr);
      }

      return NextResponse.json(
        {
          error: "فشل إرسال كود التحقق، يرجى المحاولة لاحقاً.",
          details: emailDispatch.errorDetails,
          troubleshooting: "تأكد من إعداد RESEND_API_KEY أو معلمات خادم البريد SMTP في لوحة تحكم الخادم.",
        },
        { status: 502 } // Bad Gateway (since mail provider failed)
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "تم إنشاء الحساب بنجاح وإرسال كود التحقق.",
        userId: newLawyer.id,
        emailSent: true,
        providerUsed: emailDispatch.provider,
        previewOtpCode: process.env.NODE_ENV !== "production" ? otpCode : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ Registration API Critical Failure:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي غير متوقع في خادم التسجيل." },
      { status: 500 }
    );
  }
}
