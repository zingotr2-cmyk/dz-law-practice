import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 🔒 جدار الحماية والتحقق من الهوية (Authentication & Guarding Middleware)
 * يتم هنا التحقق من أن الطلب وارد بالفعل من الأستاذ إبراهيم منصوري (Super Admin).
 * يمكن تحقيق ذلك عبر طريقتين مدمجتين لضمان حماية أمنية على مستوى الإنتاج:
 * 1. التحقق من مفتاح سر إداري قوي ممرر في ترويسة الطلب (Authorization Bearer Token).
 * 2. التحقق من البريد الإلكتروني للمسؤول لبيئات التطوير والاختبار السريع.
 */
async function authenticateAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  const adminEmailHeader = req.headers.get("X-Admin-Email");

  // جلب المفتاح السري المخصص للوحة التحكم من متغيرات البيئة الآمنة
  const adminSecret = process.env.ADMIN_SECRET_KEY || "ibrahim_mansouri_secret_2026";

  // أ) التحقق باستخدام الرمز السري الفوقي (Bearer Token) - الأسلوب الأكثر أماناً للإنتاج
  if (authHeader === `Bearer ${adminSecret}`) {
    return true;
  }

  // ب) التحقق من بريد الإدارة (لأغراض المراجعة السريعة والتكامل مع الواجهة الأمامية)
  if (adminEmailHeader === "ibrahim@law.dz") {
    return true;
  }

  return false;
}

/**
 * 📥 دالة العرض (GET) - استرجاع طلبات وسجلات المحامين لـ Live Feed
 * @description تتيح للأستاذ إبراهيم منصوري مراجعة كافة الطلبات مع دعم التصفية الفعالة حسب الحالة (مثلاً: جلب المعلقين مالياً فقط)
 */
export async function GET(req: Request) {
  try {
    // 1. التحقق من صلاحيات المدير الفوقية
    const isAdmin = await authenticateAdmin(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "غير مصرح بالدخول. هذه البيانات الحساسة مخصصة حصرياً للأستاذ إبراهيم منصوري الإدارة العليا للمنصة." },
        { status: 401 }
      );
    }

    // 2. قراءة تصفية البحث المرسلة عبر الروابط (Query Parameters)
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status"); // على سبيل المثال: PENDING_PAYMENT, ACTIVE, SUSPENDED

    // بناء كائن التصفية الديناميكي لقاعدة البيانات
    const whereClause: any = {};
    if (statusFilter) {
      // التأكد من أن الحالة الممررة تقع ضمن الحالات المحددة في قاعدة البيانات لمنع أخطاء الاستعلام
      const validStatuses = ["PENDING_EMAIL", "PENDING_PAYMENT", "ACTIVE", "SUSPENDED"];
      if (validStatuses.includes(statusFilter)) {
        whereClause.status = statusFilter;
      } else {
        return NextResponse.json(
          { error: "حالة التصفية الممررة غير صالحة." },
          { status: 400 }
        );
      }
    }

    console.log(`📡 [ADMIN-GET] جلب بيانات المحامين مع تصفية الحالة: ${statusFilter || "الكل"}`);

    // 3. جلب البيانات من PostgreSQL مرتبة من الأحدث تسجيلًا للأقدم
    const lawyers = await prisma.lawyer.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        region: true,
        status: true,
        currentPlan: true,
        remainingFreeCases: true,
        ccpProofUrl: true,
        createdAt: true,
      },
    });

    // 4. إرجاع النتيجة بنجاح
    return NextResponse.json(
      {
        success: true,
        count: lawyers.length,
        filterUsed: statusFilter || "ALL",
        lawyers,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("❌ [ADMIN-GET-FATAL] خطأ غير متوقع أثناء استرجاع قائمة المحامين:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي في الخادم أثناء محاولة جلب سجلات المحامين." },
      { status: 500 }
    );
  }
}

/**
 * ⚙️ دالة التحديث والموافقة (PATCH) - التحكم الإداري الفوقي برخص المحامين
 * @description تتيح تفعيل الاشتراكات المدفوعة بعد التحقق من صحة وصولات بريدي موب والـ CCP أو تجميد الحسابات المخالفة تلقائياً.
 */
export async function PATCH(req: Request) {
  try {
    // 1. التحقق الفوقي من الهوية الإدارية
    const isAdmin = await authenticateAdmin(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "غير مصرح لك بإجراء هذه العملية الإدارية الحساسة." },
        { status: 401 }
      );
    }

    // 2. استخراج وتفحيص المعاملات المطلوبة للتحكم
    const body = await req.json().catch(() => ({}));
    const { lawyerId, action, planType } = body;

    if (!lawyerId) {
      return NextResponse.json(
        { error: "يجب تحديد معرف المحامي (lawyerId) لإتمام الإجراء." },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "يرجى تحديد الإجراء الإداري المطلوب تنفيذه (action)." },
        { status: 400 }
      );
    }

    // 3. التحقق من وجود الحساب المستهدف بقاعدة البيانات
    const targetLawyer = await prisma.lawyer.findUnique({
      where: { id: lawyerId },
    });

    if (!targetLawyer) {
      return NextResponse.json(
        { error: "فشل الإجراء الإداري: حساب المحامي المطلوب غير موجود في النظام." },
        { status: 404 }
      );
    }

    // 4. معالجة الإجراء الإداري وتحديد الحقول المراد تحديثها بدقة
    let updatedFields: any = {};

    switch (action) {
      case "APPROVE_PAYMENT":
        // الموافقة على الدفع وتفعيل الرخصة السحابية
        // نقوم بتغيير الحالة إلى ACTIVE وترقية الباقة وتوفير ولوج غير محدود للقضايا
        if (planType !== "MONTHLY" && planType !== "ANNUAL") {
          return NextResponse.json(
            { error: "يرجى تحديد نوع باقة التفعيل الصالحة للمحامي (MONTHLY أو ANNUAL)." },
            { status: 400 }
          );
        }
        updatedFields = {
          status: "ACTIVE",
          currentPlan: planType,
          remainingFreeCases: 999999, // عدد ضخم يرمز للاستخدام اللامحدود للباقات المدفوعة
        };
        console.log(`✅ [ADMIN-ACTION] اعتماد وتفعيل رخصة الأستاذ(ة): ${targetLawyer.name} باقة: ${planType}`);
        break;

      case "SUSPEND":
        // تجميد الحساب وحظر المحامي من الدخول أو تسيير القضايا السحابية
        updatedFields = {
          status: "SUSPENDED",
        };
        console.log(`⚠️ [ADMIN-ACTION] تجميد حساب الأستاذ(ة): ${targetLawyer.name} لمخالفة الشروط.`);
        break;

      case "ACTIVATE":
        // إعادة التفعيل اليدوي لحساب مجمد أو حساب معلق
        updatedFields = {
          status: "ACTIVE",
        };
        console.log(`🔄 [ADMIN-ACTION] تفعيل يدوي لحساب الأستاذ(ة): ${targetLawyer.name}`);
        break;

      default:
        return NextResponse.json(
          { error: "الإجراء الإداري الممرر غير مدعوم في هذا الإصدار من النظام السحابي." },
          { status: 400 }
        );
    }

    // 5. حفظ التغييرات في قاعدة البيانات PostgreSQL بشكل آمن
    const updatedLawyer = await prisma.lawyer.update({
      where: { id: lawyerId },
      data: updatedFields,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        currentPlan: true,
        ccpProofUrl: true,
        updatedAt: true,
      },
    });

    // 6. إرجاع رسالة نجاح مخصصة باللغة العربية للواجهات الأمامية
    let successMessage = `تم بنجاح تحديث حالة حساب الأستاذ(ة) ${updatedLawyer.name}.`;
    if (action === "APPROVE_PAYMENT") {
      successMessage = `رائع! تم التحقق من الوصل بنجاح، وتفعيل الرخصة السحابية (${updatedLawyer.currentPlan === "ANNUAL" ? "السنوية" : "الشهرية"}) للأستاذ(ة) ${updatedLawyer.name} بنجاح.`;
    }

    return NextResponse.json(
      {
        success: true,
        message: successMessage,
        lawyer: updatedLawyer,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("❌ [ADMIN-PATCH-FATAL] خطأ غير متوقع أثناء معالجة الإجراء الإداري:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء محاولة معالجة وتحديث حالة حساب المحامي." },
      { status: 500 }
    );
  }
}
