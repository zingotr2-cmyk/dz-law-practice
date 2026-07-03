import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @api {POST} /api/auth/verify-otp التحقق من الرمز المؤقت وتنشيط حالة البريد الإلكتروني
 * @description يستقبل البريد الإلكتروني ورمز التحقق OTP المكون من 6 أرقام لتفعيل الحساب ونقله لمرحلة اختيار الخطة السحابية والتحقق المالي.
 */
export async function POST(req: Request) {
  try {
    // 1. استقبال وتفريغ مدخلات الطلب
    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email;
    const rawCode = body.code;

    // تنظيف المدخلات (إزالة المسافات الفارغة وتحويل البريد لحروف صغيرة)
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    const code = typeof rawCode === "string" ? rawCode.trim() : "";

    // 2. التحقق من سلامة وصحة المدخلات المرسلة
    if (!email) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مطلوب لإتمام عملية التحقق." },
        { status: 400 }
      );
    }

    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      return NextResponse.json(
        { error: "يرجى إدخال كود تحقق صالح ومكون من 6 أرقام." },
        { status: 400 }
      );
    }

    console.log(`📡 [OTP-VERIFY] البدء في التحقق من الرمز للحساب: ${email}`);

    // 3. التحقق من وجود حساب محامي مرتبط بهذا البريد في قاعدة البيانات
    const lawyer = await prisma.lawyer.findUnique({
      where: { email },
    });

    if (!lawyer) {
      console.warn(`⚠️ [OTP-VERIFY] محاولة تحقق لبريد إلكتروني غير مسجل بالمنصة: ${email}`);
      return NextResponse.json(
        { error: "الحساب المطلوب غير مسجل بالمنصة. يرجى إنشاء حساب جديد أولاً." },
        { status: 404 }
      );
    }

    // إذا كان الحساب قد تم تفعيله مسبقاً، نوجهه مباشرة لتفادي التكرار
    if (lawyer.status !== "PENDING_EMAIL") {
      console.log(`ℹ️ [OTP-VERIFY] الحساب مفعّل بالفعل مسبقاً. الحالة الحالية: ${lawyer.status}`);
      return NextResponse.json(
        {
          success: true,
          alreadyVerified: true,
          message: "تم التحقق من حسابك مسبقاً بنجاح.",
          status: lawyer.status,
        },
        { status: 200 }
      );
    }

    // 4. استرجاع أحدث رمز تحقق متاح لهذا البريد الإلكتروني
    const otpRecord = await prisma.oTP.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      console.warn(`❌ [OTP-VERIFY] لم يتم العثور على أي رمز OTP نشط في قاعدة البيانات للحساب: ${email}`);
      return NextResponse.json(
        { error: "لم يتم العثور على رمز تحقق نشط. يرجى طلب كود جديد." },
        { status: 404 }
      );
    }

    // 5. التحقق من صحة الكود ومطابقته رقمياً
    if (otpRecord.code !== code) {
      console.warn(`❌ [OTP-VERIFY] كود التحقق المدخل غير صحيح لـ ${email}. الكود المدخل: ${code}`);
      return NextResponse.json(
        { error: "رمز التحقق المدخل غير صحيح. يرجى التأكد من الرمز وإعادة المحاولة." },
        { status: 400 }
      );
    }

    // 6. التحقق من تاريخ انتهاء الصلاحية (فترة الأمان: 5 دقائق)
    const now = new Date();
    if (now > otpRecord.expiresAt) {
      console.warn(`⚠️ [OTP-VERIFY] كود التحقق منتهي الصلاحية لـ ${email}. انتهى في: ${otpRecord.expiresAt}`);
      
      // حذف الكود المنتهي الصلاحية تلقائياً لضمان سلامة قاعدة البيانات
      await prisma.oTP.delete({
        where: { id: otpRecord.id },
      }).catch((e) => console.error("Error deleting expired OTP:", e));

      return NextResponse.json(
        { error: "لقد انتهت صلاحية كود التحقق المدخل (صالح لمدة 5 دقائق فقط). يرجى طلب كود جديد." },
        { status: 410 } // HTTP 410 Gone
      );
    }

    // 7. تفعيل الحساب وحذف رمز التحقق المستعمل بشكل آمن داخل معاملة واحدة (Transaction)
    // لمنع أي ثغرات أو سباق عمليات (Race Conditions)
    console.log(`🔒 [OTP-VERIFY] الكود مطابق وصالح. جاري تفعيل الحساب وحذف رمز OTP مؤمن لـ: ${email}`);
    
    const [updatedLawyer] = await prisma.$transaction([
      // أ) تحديث حالة المحامي إلى انتظار دفع الرسوم أو التفعيل المالي
      prisma.lawyer.update({
        where: { email },
        data: {
          status: "PENDING_PAYMENT",
        },
      }),
      // ب) حذف رمز التحقق الذي تم استخدامه بنجاح لضمان عدم إعادة استعماله نهائياً
      prisma.oTP.delete({
        where: { id: otpRecord.id },
      }),
    ]);

    console.log(`✅ [OTP-VERIFY] تم تفعيل الحساب بنجاح بنظام المعاملات الآمنة لـ ${email}`);

    // 8. إرجاع استجابة نجاح مع حالة الحساب الجديدة وتوجيهه لاختيار خطة الاشتراك
    return NextResponse.json(
      {
        success: true,
        message: "تم التحقق من بريدك الإلكتروني بنجاح وتفعيل الحساب! يرجى الانتقال لاختيار باقة الاشتراك الخاصة بك وتأكيد الدفع.",
        lawyer: {
          id: updatedLawyer.id,
          name: updatedLawyer.name,
          email: updatedLawyer.email,
          status: updatedLawyer.status,
          currentPlan: updatedLawyer.currentPlan,
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("❌ [OTP-VERIFY-FATAL] حدث خطأ استثنائي أثناء تفعيل الحساب:", error);
    
    return NextResponse.json(
      { error: "حدث خطأ داخلي في الخادم أثناء معالجة عملية التحقق. يرجى المحاولة مرة أخرى لاحقاً." },
      { status: 500 }
    );
  }
}
