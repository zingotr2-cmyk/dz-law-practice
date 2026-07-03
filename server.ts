import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to initialize Gemini safely
  function getGeminiClient() {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      return null;
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // API Route: Send Real OTP via Resend
  app.post("/api/auth/send-otp-resend", async (req, res) => {
    const { email, code } = req.body;

    if (!email) {
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب لإرسال الرمز." });
    }

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: "كود التحقق غير صالح." });
    }

    const rawApiKey = process.env.RESEND_API_KEY;
    const apiKey = typeof rawApiKey === "string" ? rawApiKey.trim() : "";
    
    // Default fallback to the verified subdomain send.niklinx.com as requested
    let officialSender = process.env.OFFICIAL_SENDER_EMAIL || "المكتب القضائي <no-reply@send.niklinx.com>";

    // Safety check: if the user configured the base domain @niklinx.com instead of the verified subdomain send.niklinx.com, auto-correct it
    if (officialSender.includes("@niklinx.com") && !officialSender.includes("@send.niklinx.com")) {
      console.warn("⚠️ [RESEND-PROXY] Detected sender email using base domain @niklinx.com. Auto-correcting to verified subdomain @send.niklinx.com");
      officialSender = officialSender.replace("@niklinx.com", "@send.niklinx.com");
    }

    if (!apiKey || apiKey === "MY_RESEND_API_KEY" || apiKey === "") {
      console.warn("⚠️ [RESEND-PROXY] RESEND_API_KEY is missing or unconfigured in environment variables.");
      return res.status(400).json({ 
        error: "لم يتم تكوين مفتاح Resend API السري (RESEND_API_KEY) في متغيرات البيئة. يرجى إضافته في إعدادات التطبيق لإرسال إيميلات حقيقية.",
        isMock: true,
        code: code
      });
    }

    try {
      const maskedKey = apiKey.substring(0, 6) + "..." + apiKey.substring(apiKey.length - 4);
      console.log(`📡 [RESEND-PROXY] Initiating email send to [${email}] using key [${maskedKey}] and sender [${officialSender}]`);

      const htmlContent = `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: right; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); background-color: #ffffff;">
          <div style="background-color: #1A2232; padding: 30px 24px; text-align: center; border-bottom: 4px solid #D4A843;">
            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">المكتب القضائي</h2>
            <p style="color: #D4A843; margin: 6px 0 0; font-size: 11px; letter-spacing: 2px; font-weight: 700; text-transform: uppercase;">بوابة التحقق من الهوية الرقمية للزملاء المحامين</p>
          </div>
          <div style="padding: 35px 30px; color: #1e293b; line-height: 1.8;">
            <h3 style="color: #1A2232; font-size: 19px; margin-top: 0; margin-bottom: 18px; font-weight: 700; text-align: right;">الأستاذ الفاضل، الزميل المحامي،</h3>
            <p style="font-size: 14px; margin-bottom: 28px; text-align: right; color: #475569;">
              لقد تلقينا طلباً لإنشاء وتفعيل حسابك السحابي في منصة <strong>المكتب القضائي</strong> لإدارة القضايا والملفات القضائية بالجزائر. 
              لإتمام تفعيل بريدك والولوج الآمن، يرجى استخدام رمز الأمان لمرة واحدة (OTP) التالي:
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #D4A843; border-radius: 14px; padding: 18px 45px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 900; color: #1A2232; letter-spacing: 8px;">${code}</span>
              </div>
            </div>

            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 14px; padding: 16px 20px; margin-bottom: 28px; text-align: right;">
              <strong style="color: #b45309; font-size: 13px; display: block; margin-bottom: 4px;">⚠️ صلاحية الرمز وأمان حسابك:</strong>
              <span style="color: #78350f; font-size: 12px; display: block; leading-relaxed: 1.5;">
                رمز التحقق هذا صالح للاستخدام لمدة <strong>5 دقائق فقط</strong> من وقت الصدور. يرجى عدم مشاركته مع أي شخص لضمان سرية وسلامة بيانات ملفاتك ومكتبك القضائي.
              </span>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 20px; text-align: right; border-top: 1px solid #f1f5f9; padding-top: 15px;">
              إذا لم تقم بإنشاء حساب في منصتنا، فيرجى تجاهل هذا البريد تماماً.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; font-weight: 500;">
            منصة سحابية متكاملة للمحاماة والمستندات القضائية بالجزائر © 2026
          </div>
        </div>
      `;

      // 🚀 Outbound call directly to Resend API without any mock sandbox fallback
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
          },
          body: JSON.stringify({
            from: officialSender,
            to: email,
            subject: "🔑 رمز الأمان الثنائي للتحقق - المكتب القضائي",
            html: htmlContent
          })
        });

        let resData: any = null;
        try {
          resData = await response.json();
        } catch (jsonErr: any) {
          resData = { message: "فشل فك استجابة Resend JSON", rawError: jsonErr.message };
        }

        if (response.ok) {
          console.log("✅ [RESEND-PROXY-SUCCESS] Email sent successfully via Resend. ID:", resData?.id);
          return res.json({
            success: true,
            message: "تم إرسال كود التحقق بنجاح إلى علبة الوارد الخاصة بك!",
            resData
          });
        } else {
          console.error("❌ [RESEND-PROXY-ERROR] Resend API failed. Status:", response.status);
          console.error("❌ [RESEND-PROXY-ERROR] Error Details:", JSON.stringify(resData, null, 2));
          return res.status(response.status).json({
            error: resData?.message || "فشلت منصة Resend في إرسال الإيميل.",
            details: resData,
            status: response.status
          });
        }
      } catch (err: any) {
        console.error("❌ [RESEND-PROXY-FATAL] Outbound request failed:", err.message || err);
        return res.status(500).json({
          error: "حدث خطأ في الاتصال بخوادم Resend لإرسال الإيميل. تفاصيل: " + (err.message || err)
        });
      }

    } catch (err: any) {
      console.error("❌ [RESEND-PROXY-FATAL] Network or Connection Error while hitting Resend:", err);
      return res.status(500).json({
        error: "حدث خطأ غير متوقع أثناء إرسال البريد الإلكتروني. يرجى التحقق من اتصالك بالشبكة والـ API Key الخاص بك.",
        details: err.message || err
      });
    }
  });

  // API Route: Summarize Legal Documents
  app.post("/api/summarize", async (req, res) => {
    const { text, docName } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "محتوى الوثيقة فارغ!" });
    }

    try {
      const ai = getGeminiClient();

      if (!ai) {
        // Return a beautiful, high-fidelity mock legal summary if no API key is configured
        // This is professional, detailed, and simulates Algerian legal terminology perfectly.
        const mockResponse = `### 📋 تلخيص قضائي ذكي: ${docName || "مذكرة جوابية"}
---
#### ⚖️ أطراف الخصومة:
* **المدعي (صاحب الدعوى):** بن عيسى مصطفى (مُمثّل بالأستاذ عمارة)
* **المدعى عليه:** شركة الترقية العقارية "الديار الحديثة" (مُمثلة بالأستاذ أحمد بن علي)

#### 📝 موضوع النزاع:
تأخر في تسليم شقة سكنية (صيغة الترقوي العقاري LPL) الكائنة ببلدية بئر مراد رايس، مع المطالبة بالتعويض عن الضرر الناتج عن حرمان الاستغلال.

#### ⚖️ الأسانيد والوقائع القانونية:
1. عقد البيع على التصاميم المؤرخ في **12 جانفي 2024** المبرم أمام الموثق.
2. المادة **119** من القانون المدني الجزائري (المتعلقة بفسخ العقد والتعويض عند الإخلال بالالتزامات).
3. إعذار مرسل عن طريق المحضر القضائي مؤرخ في **05 مارس 2026** بدون جدوى.

#### 🏛️ محكمة الاختصاص:
* **الجهة القضائية:** محكمة بئر مراد رايس - القسم العقاري.

#### 🔔 التوصيات والآجال القانونية:
* **الآجال الحالية:** تقديم المذكرة الجوابية قبل تاريخ الجلسة القادمة المقررة في **14 جويلية 2026**.
* **الاستراتيجية المقترحة:** الدفع بالقوة القاهرة بسبب تأخر أشغال تهيئة الطريق الخارجي من طرف البلدية، للتحلل من التزام التعويض عن التأخير طبقاً للمادة **127** من القانون المدني.

---
⚠️ *ملاحظة: هذا تلخيص افتراضي ومحاكاة ممتازة للنظام لعدم توفر مفتاح غوغل جيميناي (GEMINI_API_KEY) في إعدادات التطبيق. لربط الذكاء الاصطناعي الحقيقي، قم بإضافته في قائمة الأسرار (Secrets).*`;
        
        // Wait 1.5 seconds to simulate a network call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return res.json({ summary: mockResponse, isMock: true });
      }

      // If we have Gemini client, do the real call
      const prompt = `أنت خبير قانوني جزائري ومستشار قضائي رصين. قم بتلخيص الوثيقة القضائية التالية تلخيصاً مهنياً دقيقاً وهيكلياً.
اسم الوثيقة: ${docName || "وثيقة غير مسمية"}
الوثيقة المراد تلخيصها:
${text}

استخرج العناصر التالية بدقة وتنسيق رائع بـ Markdown:
1. **أطراف الخصومة والوكلاء**
2. **الوقائع وموضوع النزاع باختصار**
3. **الأسانيد والمواد القانونية المعتمدة (من التشريع الجزائري)**
4. **الطلبات والطلبات المقابلة**
5. **الآجال الإجرائية والتوصيات المهنية للمحامي**

صغ التلخيص بأسلوب قانوني جزائري محترف وراقٍ بلغة عربية فصحى مع استخدام علامات الترقيم والأيقونات التعبيرية المناسبة لتبدو لوحة التحكم استثنائية وجذابة للغاية.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return res.json({ summary: response.text, isMock: false });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({
        error: "فشل الاتصال بـ Gemini AI. تفاصيل الخطأ: " + (error.message || error),
      });
    }
  });

  // API Route: Ask Legal Assistant (Algerian Law Q&A Grounded)
  app.post("/api/ask-legal", async (req, res) => {
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "السؤال فارغ!" });
    }

    try {
      const ai = getGeminiClient();

      if (!ai) {
        // Return mock reply if no API key
        const mockResponses: { [key: string]: string } = {
          default: `### ⚖️ الإجابة القانونية المقترحة (محاكاة):
نصت المادة **324** مكرر 1 من القانون المدني الجزائري على وجوب تحرير العقود التي تتضمن نقل ملكية عقارية أو حقوق عينية أخرى في شكل رسمي (عقد توثيقي) تحت طائلة البطلان المطلق. 

بالتالي، أي بيع عقاري تم بموجب عرف عادي دون إفراغه في قالب رسمي أمام الموثق يعتبر باطلاً بطلاناً مطلقاً ولا ينتج أي أثر ناقل للملكية، ويمكن لأي ذي مصلحة التمسك بالبطلان أو تثيره المحكمة تلقائياً.

*ملاحظة: هذا الجواب افتراضي ومبني على قواعد البيانات المدمجة. لتفعيل الاستشارات الحية بذكاء جيميناي الحقيقي، قم بإعداد مفتاح الـ API.*`,
        };

        await new Promise((resolve) => setTimeout(resolve, 1200));
        return res.json({ answer: mockResponses.default, isMock: true });
      }

      const systemPrompt = `أنت مستشار قانوني جزائري خبير ومحامي معتمد لدى المحكمة العليا ومجلس الدولة في الجزائر. تملك معرفة شاملة بالقانون المدني، القانون التجاري، قانون الأسرة، قانون العقوبات وقانون الإجراءات المدنية والإدارية الجزائري.
أجب عن الأسئلة القانونية التي يطرحها الأستاذ بأقصى درجات الدقة القانونية، مع ذكر المواد القانونية ذات الصلة من التشريع الجزائري الرسمي (الجريدة الرسمية للجمهورية الجزائرية).
صغ الإجابة في قالب Markdown رائع ومنظم ومفهوم جداً وبأسلوب يليق بمحامٍ خبير.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: question,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      return res.json({ answer: response.text, isMock: false });
    } catch (error: any) {
      console.error("Gemini legal Q&A error:", error);
      return res.status(500).json({
        error: "فشل الاتصال بـ Gemini AI. تفاصيل الخطأ: " + (error.message || error),
      });
    }
  });

  // API Route: Generate Contract/Legal Document Template
  app.post("/api/generate-template", async (req, res) => {
    const { type, details } = req.body;

    try {
      const ai = getGeminiClient();

      if (!ai) {
        const mockTemplate = `### ⚖️ مسودة نموذج عقد (محاكاة): ${type || "عقد إيجار سكن"}
---
**إنه في يومه الموافق لـ:** [تاريخ اليوم]
**بين الموقعين أسفله:**
1. **السيد:** [اسم المؤجر الكامل]، المولود في [تاريخ الميلاد] بـ [مكان الميلاد]، الساكن بـ [العنوان الحالي]، الحامل لبطاقة التعريف الوطنية رقم [رقم البطاقة] الصادرة بتاريخ [تاريخ الإصدار] عن [الجهة].  --- *(يشار إليه بـ "المؤجر")*
2. **السيد:** [اسم المستأجر الكامل]، المولود في [تاريخ الميلاد] بـ [مكان الميلاد]، الساكن بـ [العنوان الحالي]، الحامل لبطاقة التعريف الوطنية رقم [رقم البطاقة] الصادرة بتاريخ [تاريخ الإصدار] عن [الجهة].  --- *(يشار إليه بـ "المستأجر")*

#### 📜 تمهيد اتفاقي:
حيث أن المؤجر يملك شقة سكنية كائنة بـ [العنوان الكامل للشقة]، وهي شاغرة وصالحة للسكن، ورغب المستأجر في استئجارها، فقد اتفق الطرفان على ما يلي:

#### 📌 شروط البنود الأساسية:
* **البند الأول: موضوع العقد:** يلتزم المؤجر بتمكين المستأجر من الانتفاع بالشقة الموصوفة أعلاه بغرض السكن العائلي فقط.
* **البند الثاني: مدة الإيجار:** حددت مدة هذا الإيجار بـ [مثلاً: سنة واحدة] تبدأ من [تاريخ البدء] وتنتهي في [تاريخ الانتهاء]، وتكون غير قابلة للتجديد إلا باتفاق مكتوب جديد بين الطرفين وطبقاً للقانون المدني الجزائري المادتين **467** و **469**.
* **البند الثالث: بدل الإيجار:** اتفق الطرفان على بدل إيجار شهري قدره [القيمة بالأرقام والكلمات - دج] يدفع بانتظام مسبقاً كل [شهر/ثلاثة أشهر] مع وصل استلام موقع من المؤجر.
* **البند الرابع: التزامات المستأجر:** يلتزم المستأجر بالمحافظة على العين المؤجرة واستعمالها بعناية، ولا يجوز له إجراء تعديلات جوهرية دون إذن مكتوب، كما يحظر عليه كلياً الإيجار من الباطن.

**توقيع المؤجر:**                             **توقيع المستأجر:**
[التوقيع]                                    [التوقيع]`;

        await new Promise((resolve) => setTimeout(resolve, 1500));
        return res.json({ template: mockTemplate, isMock: true });
      }

      const prompt = `صغ مسودة نموذج قانوني متكامل لـ "${type}" بالاعتماد على المدخلات والشروط التالية:
"${details}"
الوثيقة يجب أن تكون متوافقة تماماً مع القوانين والأنظمة المعمول بها في الجزائر. صغها بأسلوب توثيقي أو قضائي جزائري ممتاز بأسلوب رسمي وجميل جداً، مع ترك فراغات بين معقوفتين [مثل هذا] لملء التفاصيل والأسماء، واستخدم تنسيق Markdown الأنيق والهيكلي الكامل لتسهيل قراءته ونسخه.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return res.json({ template: response.text, isMock: false });
    } catch (error: any) {
      console.error("Gemini Template Generator Error:", error);
      return res.status(500).json({
        error: "فشل الاتصال بـ Gemini AI لتوليد النموذج. " + (error.message || error),
      });
    }
  });

  // Handle Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
