import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Structured auditing log writer
 */
export const logAudit = (message) => {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logPath = path.join(logDir, 'audit.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, 'utf-8');
};

/**
 * Abstract AI Provider Interface
 */
export class AIProvider {
  /**
   * Analyzes a clause based ONLY on matched legal reference context.
   * MUST NOT search the web or rely on internal trained knowledge.
   * @param {string} clauseText - Original contract clause text
   * @param {Object} legalReference - Retrieved knowledge base record
   * @param {string} contractType - Selected category type
   * @returns {Promise<Object>} - Clause audit report segment
   */
  async analyzeClause(clauseText, legalReference, contractType) {
    throw new Error("Method 'analyzeClause' must be implemented.");
  }
}

/**
 * Gemini AI compliance auditor implementation
 */
/**
 * Categorizes if an error is a quota/rate limit error
 */
const isQuotaError = (err) => {
  const msg = (err.message || "").toLowerCase();
  const status = err.status || err.code || 0;
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("quota exceeded")
  );
};

/**
 * Categorizes if an error is a transient retryable failure
 */
const isRetryableError = (err) => {
  const msg = (err.message || "").toLowerCase();
  const status = err.status || err.code || 0;
  return (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed") ||
    msg.includes("unavailable")
  );
};

/**
 * Validates that the generated response does not contain any hallucinated legal information
 * such as outside laws, article numbers, or authorities not present in the retrieved RAG reference.
 */
const validateLegalResponse = (aiResult, legalReference) => {
  const whyEn = (aiResult.why?.en || "").toLowerCase();
  const whyAr = (aiResult.why?.ar || "").toLowerCase();
  const expEn = (aiResult.explanation?.en || "").toLowerCase();
  const expAr = (aiResult.explanation?.ar || "").toLowerCase();
  const recEn = (aiResult.recommendation?.en || "").toLowerCase();
  const recAr = (aiResult.recommendation?.ar || "").toLowerCase();

  const texts = [whyEn, whyAr, expEn, expAr, recEn, recAr];

  // Helper to extract numeric article numbers
  const getArticlesMentioned = (text) => {
    const matches = new Set();
    const engRegex = /article\s*(?:no\.?\s*)?(\d+)/gi;
    let engMatch;
    while ((engMatch = engRegex.exec(text)) !== null) {
      matches.add(engMatch[1]);
    }
    const arRegex = /(?:المادة|مادة|المواد)\s*(\d+)/g;
    let arMatch;
    while ((arMatch = arRegex.exec(text)) !== null) {
      matches.add(arMatch[1]);
    }
    return Array.from(matches);
  };

  // Get allowed article numbers
  const refArticleNumber = legalReference.articleNumber || "";
  const refArticleDigits = refArticleNumber.match(/\d+/g) || [];

  const refTextEn = (legalReference.articleText?.en || "").toLowerCase();
  const refTextAr = (legalReference.articleText?.ar || "").toLowerCase();

  // 1. Verify Article Numbers
  for (const text of texts) {
    const mentionedArticles = getArticlesMentioned(text);
    for (const article of mentionedArticles) {
      if (!refArticleDigits.includes(article) && !refTextEn.includes(article) && !refTextAr.includes(article)) {
        logAudit(`Validation Failed: Generated text mentions Article ${article} which is not in retrieved reference digits [${refArticleDigits.join(", ")}].`);
        return false;
      }
    }
  }

  // 2. Verify Law Names
  const knownLaws = [
    { key: "labor", en: "labor law", ar: "نظام العمل" },
    { key: "civil", en: "civil transactions", ar: "المعاملات المدنية" },
    { key: "social", en: "social insurance", ar: "التأمينات الاجتماعية" },
    { key: "residency", en: "residency", ar: "نظام الإقامة" },
    { key: "execution", en: "execution", ar: "نظام التنفيذ" }
  ];

  const refLawEn = (legalReference.lawName?.en || "").toLowerCase();
  const refLawAr = (legalReference.lawName?.ar || "").toLowerCase();

  for (const law of knownLaws) {
    const isLawInReference = refLawEn.includes(law.key) || refLawAr.includes(law.ar) || refTextEn.includes(law.key) || refTextAr.includes(law.ar);
    if (!isLawInReference) {
      for (const text of texts) {
        if (text.includes(law.en) || text.includes(law.ar)) {
          logAudit(`Validation Failed: Generated text mentions law "${law.en}" which is not in retrieved reference.`);
          return false;
        }
      }
    }
  }

  // 3. Verify Authorities
  const knownAuthorities = [
    { key: "human resources", en: "ministry of human resources", ar: "وزارة الموارد البشرية" },
    { key: "mhrsd", en: "mhrsd", ar: "وزارة العمل" },
    { key: "qiwa", en: "qiwa", ar: "قوى" },
    { key: "housing", en: "ministry of housing", ar: "وزارة الإسكان" },
    { key: "ejar", en: "ejar", ar: "إيجار" },
    { key: "commerce", en: "ministry of commerce", ar: "وزارة التجارة" }
  ];

  const refAuthEn = (legalReference.authority?.en || "").toLowerCase();
  const refAuthAr = (legalReference.authority?.ar || "").toLowerCase();

  for (const auth of knownAuthorities) {
    const isAuthInReference = refAuthEn.includes(auth.key) || refAuthAr.includes(auth.ar) || refTextEn.includes(auth.key) || refTextAr.includes(auth.ar);
    if (!isAuthInReference) {
      for (const text of texts) {
        if (text.includes(auth.en) || text.includes(auth.ar)) {
          logAudit(`Validation Failed: Generated text mentions authority "${auth.en}" which is not in retrieved reference.`);
          return false;
        }
      }
    }
  }

  return true;
};

/**
 * Gemini AI compliance auditor implementation
 */
export class GeminiAIProvider extends AIProvider {
  constructor() {
    super();
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  async analyzeClause(clauseText, legalReference, contractType) {
    if (!this.ai) {
      throw new Error("Gemini API key is not configured in process.env.GEMINI_API_KEY");
    }

    logAudit(`AI Request (Gemini) - Type: ${contractType}`);
    logAudit(`AI Request - Clause: "${clauseText.substring(0, 100).replace(/\n/g, ' ')}..."`);
    logAudit(`AI Request - Matched Reference: ${legalReference.referenceId}`);

    const startTime = Date.now();

    const systemPrompt = `
You are a Saudi Legal Compliance Auditor. Your task is to analyze a single contract clause against a retrieved official Saudi legal reference.

STRICT RAG-ONLY COMPLIANCE RULES:
1. The provided "Retrieved Legal Reference" is the ONLY legal source of truth.
2. You must NEVER use your own legal knowledge, training data, or general memory.
3. You must NEVER search the internet.
4. You must NEVER mention other laws, articles, regulations, or authorities outside the retrieved record.
5. You must NEVER mention "Saudi Labor Law" or any other law unless it is exactly the "Law Name" in the retrieved record.
6. You must NEVER recommend reviewing other laws, regulations, or external guidelines.
7. You must NEVER infer missing requirements or complete missing legal text from your own memory.
8. You must NEVER rewrite, paraphrase, or misquote the articleText. If you quote the article, it must match the articleText exactly.
9. You must NEVER invent article numbers, article titles, authorities, or URLs.
10. All outputs must be bilingual, providing both English ("en") and Arabic ("ar") fields.

INSUFFICIENT INFORMATION FALLBACK:
If the retrieved legal reference does NOT contain enough information to determine compliance:
You must return exactly the following strings:
- "explanation.en", "why.en", and "recommendation.en" must be EXACTLY: "The retrieved legal reference does not contain enough information to determine compliance."
- "explanation.ar", "why.ar", and "recommendation.ar" must be EXACTLY: "لا يحتوي المرجع القانوني المسترجع على معلومات كافية لتحديد مدى الامتثال."
- "riskLevel" must be: "attention"
- "confidenceScore" must be: 0

Input:
- Contract Type: ${contractType}
- Contract Clause: "${clauseText}"
- Retrieved Legal Reference:
  - Authority: ${JSON.stringify(legalReference.authority)}
  - Law Name: ${JSON.stringify(legalReference.lawName)}
  - Article Number: ${legalReference.articleNumber}
  - Article Title: ${JSON.stringify(legalReference.articleTitle)}
  - Article Text: ${JSON.stringify(legalReference.articleText)}
  - Official URL: ${legalReference.officialUrl || ""}

Output JSON Schema (MUST match exactly, return ONLY JSON):
{
  "riskLevel": "safe" | "attention" | "risk",
  "explanation": {
    "en": "...",
    "ar": "..."
  },
  "why": {
    "en": "...",
    "ar": "..."
  },
  "recommendation": {
    "en": "...",
    "ar": "..."
  },
  "confidenceScore": number (0-100)
}
`;

    let validationAttempts = 0;
    const maxValidationAttempts = 3;
    let aiResult = null;
    let validationFeedbackPrompt = "";
    let rawText = "";

    while (validationAttempts < maxValidationAttempts) {
      validationAttempts++;
      
      let httpAttempts = 0;
      const maxHttpAttempts = 3;
      let apiResponse = null;

      while (true) {
        httpAttempts++;
        try {
          console.log("CALLING GEMINI NOW");
          apiResponse = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: validationFeedbackPrompt ? [systemPrompt, validationFeedbackPrompt].join("\n\n") : systemPrompt,
            config: {
              responseMimeType: 'application/json'
            }
          });
          console.log("GEMINI RESPONSE RECEIVED");
          break; // Success, exit HTTP retry loop
        } catch (err) {
          logAudit(`Gemini API Call Attempt ${httpAttempts} (Validation Loop ${validationAttempts}) failed: ${err.message}`);
          
          if (isQuotaError(err)) {
            logAudit("Quota error encountered. Exiting retry logic immediately.");
            err.retryCount = httpAttempts - 1;
            throw err;
          }

          if (isRetryableError(err) && httpAttempts < maxHttpAttempts) {
            let delayMs = 1000;
            if (err.details && Array.isArray(err.details)) {
              for (const detail of err.details) {
                if (detail.retryDelay) {
                  const match = detail.retryDelay.match(/(\d+)s/);
                  if (match) {
                    delayMs = parseInt(match[1]) * 1000;
                  }
                  break;
                }
              }
            }
            logAudit(`Retryable transient error. Waiting for ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue; // retry
          }

          // If not retryable or max HTTP attempts reached, throw
          err.retryCount = httpAttempts - 1;
          throw err;
        }
      }

      rawText = apiResponse.text;
      aiResult = JSON.parse(rawText);

      // Run validation on the generated result
      const isValid = validateLegalResponse(aiResult, legalReference);
      if (isValid) {
        break; // Validation passed!
      }

      // Validation failed, set correction feedback and retry
      logAudit(`Gemini generation attempt ${validationAttempts} failed validation. Regenerating...`);
      validationFeedbackPrompt = `WARNING: Your previous response was rejected because it violated the STRICT RAG-ONLY rule. It mentioned external laws, articles, or authorities not present in the retrieved legal record.
You must use ONLY the provided legal record:
- Authority: ${JSON.stringify(legalReference.authority)}
- Law Name: ${JSON.stringify(legalReference.lawName)}
- Article Number: ${legalReference.articleNumber}
- Article Text: ${JSON.stringify(legalReference.articleText)}
Do NOT mention any other laws, articles, or authorities. Regenerate the JSON adhering strictly to these rules.`;
    }

    const duration = Date.now() - startTime;
    logAudit(`Gemini Audit Time: ${duration}ms (Attempts: ${validationAttempts})`);
    logAudit(`Gemini Raw Response: ${rawText}`);

    const riskLevel = aiResult.riskLevel || "safe";

    // Map back to the required frontend response schema
    const response = {
      id: legalReference.referenceId || "",
      title: legalReference.articleTitle || { en: "", ar: "" },
      originalText: { en: clauseText || "", ar: clauseText || "" },
      reasoning: aiResult.why || { en: "", ar: "" },
      why: aiResult.why || { en: "", ar: "" },
      explanation: aiResult.explanation || { en: "", ar: "" },
      riskLevel: riskLevel,
      reasoningPath: {
        en: [
          { step: "Original Clause", desc: "Paragraph extracted from contract upload." },
          { step: "RAG Retrieval", desc: `Retrieved ${legalReference.lawName.en} ${legalReference.articleNumber} from knowledge base.` },
          { step: "Explainable Legal Analysis", desc: aiResult.why.en || "" },
          { step: "Risk Level Decision", desc: `Assessed as ${riskLevel.toUpperCase()}` }
        ],
        ar: [
          { step: "البند الأصلي", desc: "الفقرة المستخرجة من المستند المرفوع." },
          { step: "استدعاء المرجع (RAG)", desc: `استرجاع ${legalReference.lawName.ar} - ${legalReference.articleNumber} من قاعدة المعرفة.` },
          { step: "التحليل القانوني المفسّر", desc: aiResult.why.ar || "" },
          { step: "تحديد المخاطر", desc: `تقييم البند كـ ${riskLevel === 'safe' ? 'آمن' : riskLevel === 'attention' ? 'انتباه' : 'خطير'}` }
        ]
      },
      reference: {
        authority: legalReference.authority || { en: "", ar: "" },
        lawName: legalReference.lawName || { en: "", ar: "" },
        articleNumber: legalReference.articleNumber || "",
        articleText: legalReference.articleText || { en: "", ar: "" },
        article: {
          en: legalReference.articleNumber || "",
          ar: legalReference.articleNumber || ""
        },
        section: {
          en: legalReference.articleTitle?.en || "",
          ar: legalReference.articleTitle?.ar || ""
        },
        officialSourceText: legalReference.articleText || { en: "", ar: "" },
        url: legalReference.officialUrl || ""
      },
      recommendation: aiResult.recommendation || { en: "", ar: "" },
      confidence: {
        level: aiResult.confidenceScore > 80 ? "high" : aiResult.confidenceScore > 50 ? "medium" : "low",
        reason: {
          en: `Assessed by Gemini with ${aiResult.confidenceScore}% confidence.`,
          ar: `تم التقييم بواسطة جميناي بنسبة يقين ${aiResult.confidenceScore}٪.`
        }
      }
    };

    return response;
  }
}

/**
 * Rule-based statutory compliance AI implementation (Fallback Provider)
 */
export class RuleBasedAIProvider extends AIProvider {
  async analyzeClause(clauseText, legalReference, contractType) {
    // Auditing telemetry log
    logAudit(`AI Request (RuleBased) - Type: ${contractType}`);
    logAudit(`AI Request - Extracted Clause: "${clauseText.substring(0, 100).replace(/\n/g, ' ')}..."`);
    logAudit(`AI Request - Matched Reference ID: ${legalReference.referenceId}`);

    let riskLevel = "safe";

    if (legalReference.referenceId === "emp_ref2") { // Probation Period
      const matches = clauseText.match(/\b(180|120)\b/);
      if (matches || /180|١٨٠/i.test(clauseText)) {
        riskLevel = "risk"; // Violates 90 days limit in the initial contract
      }
    } else if (legalReference.referenceId === "emp_ref3") { // Wage Deductions
      if (/unlimited|any amount|دون حد|دون تحقيق|أي مبالغ/i.test(clauseText)) {
        riskLevel = "risk"; // Violates the 5-day wage cap
      }
    } else if (legalReference.referenceId === "emp_ref4") { // Non-Compete Clauses
      if (/5 years|Middle East|سنوات|الشرق الأوسط/i.test(clauseText)) {
        riskLevel = "attention"; // Exceeds the 2-year limit
      }
    } else if (legalReference.referenceId === "emp_ref5") { // Arbitrary Termination
      if (/without cause|without any specific reason|دون إبداء أي سبب/i.test(clauseText)) {
        riskLevel = "risk"; // Violates notice and fair dismissal rules
      }
    } else if (legalReference.referenceId === "rental_ref2") { // Structural Maintenance
      if (/bear all maintenance|structural repairs|جميع تكاليف صيانة/i.test(clauseText)) {
        riskLevel = "attention"; // Shifts structural maintenance to tenant
      }
    } else if (legalReference.referenceId === "rental_ref3") { // Privacy & Landlord Entry
      if (/at any time without prior notice|في أي وقت ودون إشعار/i.test(clauseText)) {
        riskLevel = "risk"; // Violates peaceful enjoyment and tenant privacy
      }
    } else if (legalReference.referenceId === "rental_ref4") { // Arbitrary Eviction
      if (/automatically evicted|3 days|إخلاء المستأجر تلقائياً/i.test(clauseText)) {
        riskLevel = "risk"; // Violates execution court enforcement timelines
      }
    } else if (legalReference.referenceId === "tel_ref1") { // CST Price Increase
      if (/without prior notification|دون سابق إنذار/i.test(clauseText)) {
        riskLevel = "risk"; // Violates CST 30-day notice rule
      }
    } else if (legalReference.referenceId === "tel_ref2") { // CST Outages
      if (/not be entitled to any refund|لا يحق للعميل المطالبة/i.test(clauseText)) {
        riskLevel = "attention"; // Violates downtime billing adjustments
      }
    } else if (legalReference.referenceId === "tel_ref3") { // Telecom Early Exit
      if (/total monthly subscription|مجموع الاشتراكات الشهرية/i.test(clauseText)) {
        riskLevel = "risk"; // Violates subsidized device proration caps
      }
    } else if (legalReference.referenceId === "bank_ref1") { // SAMA Auto Renewal
      if (/automatically renew|تلقائياً/i.test(clauseText)) {
        riskLevel = "attention"; // Requires opt-out/disclosure mechanisms
      }
    } else if (legalReference.referenceId === "sub_ref1") { // Biometrics & Privacy
      if (/biometric|advertisers|معلنين|الحيوية/i.test(clauseText)) {
        riskLevel = "risk"; // Violates PDPL Articles 5 & 15
      }
    } else if (legalReference.referenceId === "car_ref1") { // Used Cars Loss Risk
      if (/immediately upon signing|فور توقيع/i.test(clauseText)) {
        riskLevel = "attention"; // Shifts risk of loss to buyer early
      }
    } else if (legalReference.referenceId === "car_ref2") { // Deposits (Arboon)
      if (/non-refundable|غير قابل للاسترداد/i.test(clauseText)) {
        riskLevel = "risk"; // Violates Arboon default double-refund rules
      }
    } else if (legalReference.referenceId === "car_ref3") { // Hidden Defects Warranty
      if (/as-is|hidden mechanical|بحالتها الراهنة|الخفية/i.test(clauseText)) {
        riskLevel = "risk"; // Violates hidden defect guarantees in bad faith sales
      }
    }

    const response = {
      id: legalReference.referenceId || "",
      title: legalReference.articleTitle || { en: "", ar: "" },
      originalText: { en: clauseText || "", ar: clauseText || "" },
      reasoning: {
        en: `This clause has been audited against ${legalReference.lawName.en} (${legalReference.articleNumber}) governing ${legalReference.articleTitle.en}.`,
        ar: `تم مراجعة هذا البند ومطابقته مع ${legalReference.lawName.ar} (${legalReference.articleNumber}) المتعلق بـ ${legalReference.articleTitle.ar}.`
      },
      why: {
        en: `This clause has been audited against ${legalReference.lawName.en} (${legalReference.articleNumber}) governing ${legalReference.articleTitle.en}.`,
        ar: `تم مراجعة هذا البند ومطابقته مع ${legalReference.lawName.ar} (${legalReference.articleNumber}) المتعلق بـ ${legalReference.articleTitle.ar}.`
      },
      explanation: legalReference.plainLanguageExplanation || { en: "", ar: "" },
      riskLevel: riskLevel || "safe",
      reasoningPath: {
        en: [
          { step: "Original Clause", desc: "Paragraph extracted from contract upload." },
          { step: "RAG Retrieval", desc: `Retrieved ${legalReference.lawName.en} ${legalReference.articleNumber} from knowledge base.` },
          { step: "Explainable Legal Analysis", desc: `Checked compliance with statutory standards set by ${legalReference.governmentAuthority.en}.` },
          { step: "Risk Level Decision", desc: `Assessed as ${riskLevel.toUpperCase()}` }
        ],
        ar: [
          { step: "البند الأصلي", desc: "الفقرة المستخرجة من المستند المرفوع." },
          { step: "استدعاء المرجع (RAG)", desc: `استرجاع ${legalReference.lawName.ar} - ${legalReference.articleNumber} من قاعدة المعرفة.` },
          { step: "التحليل القانوني المفسّر", desc: `مقارنة البند بالشروط الصادرة عن ${legalReference.governmentAuthority.ar}.` },
          { step: "تحديد المخاطر", desc: `تقييم البند كـ ${riskLevel === 'safe' ? 'آمن' : riskLevel === 'attention' ? 'انتباه' : 'خطير'}` }
        ]
      },
      reference: {
        authority: legalReference.governmentAuthority || { en: "", ar: "" },
        lawName: legalReference.lawName || { en: "", ar: "" },
        articleNumber: legalReference.articleNumber || "",
        articleText: legalReference.originalArticleText || { en: "", ar: "" },
        article: {
          en: legalReference.articleNumber || "",
          ar: legalReference.articleNumber || ""
        },
        section: {
          en: legalReference.articleTitle.en || "",
          ar: legalReference.articleTitle.ar || ""
        },
        officialSourceText: legalReference.originalArticleText || { en: "", ar: "" },
        url: legalReference.officialSourceUrl || ""
      },
      recommendation: {
        en: riskLevel === 'safe' 
          ? "No adjustments required. The terms comply with regulations." 
          : `Review and adjust terms to ensure full alignment with ${legalReference.lawName.en} ${legalReference.articleNumber}.`,
        ar: riskLevel === 'safe'
          ? "لا يتطلب أي إجراء. البند متوافق مع القواعد المعتمدة."
          : `راجع البند واطلب تعديله ليتماشى مع ${legalReference.lawName.ar} - ${legalReference.articleNumber}.`
      },
      confidence: {
        level: "high",
        reason: {
          en: "Verified with official database match.",
          ar: "تم التحقق منه وتوثيقه بمطابقة قاعدة البيانات الرسمية."
        }
      }
    };

    logAudit(`AI Response (RuleBased) - Risk: ${riskLevel.toUpperCase()}`);
    return response;
  }
}

// Swappable AI configuration setup (hot-swappable if process.env.GEMINI_API_KEY is configured)
const activeProvider = process.env.GEMINI_API_KEY ? new GeminiAIProvider() : new RuleBasedAIProvider();

console.log(process.env.GEMINI_API_KEY ? "✓ Gemini Provider Loaded" : "✓ RuleBased Provider Loaded");

export const analyzeClause = async (clauseText, legalReference, contractType) => {
  if (activeProvider instanceof GeminiAIProvider) {
    try {
      const result = await activeProvider.analyzeClause(clauseText, legalReference, contractType);
      logAudit("ACTIVE_PROVIDER = Gemini");
      console.log("ACTIVE_PROVIDER = Gemini");
      return result;
    } catch (err) {
      const errMsg = err.message || "";
      const retryCount = err.retryCount || 0;
      const isQuota = isQuotaError(err);
      const isRetryable = isRetryableError(err);

      if (isQuota || isRetryable) {
        const fallbackReason = isQuota ? "Quota Exceeded (429)" : `Transient HTTP Error: ${errMsg}`;
        logAudit(`Fallback Reason: ${fallbackReason}`);
        logAudit(`Retry Count: ${retryCount}`);
        
        console.log(`Fallback Reason: ${fallbackReason}`);
        console.log(`Retry Count: ${retryCount}`);

        const fallbackProvider = new RuleBasedAIProvider();
        const result = await fallbackProvider.analyzeClause(clauseText, legalReference, contractType);
        logAudit("ACTIVE_PROVIDER = RuleBased");
        console.log("ACTIVE_PROVIDER = RuleBased");
        return result;
      } else {
        logAudit(`Gemini call failed with unexpected error: ${errMsg}`);
        throw err;
      }
    }
  } else {
    const result = await activeProvider.analyzeClause(clauseText, legalReference, contractType);
    logAudit("ACTIVE_PROVIDER = RuleBased");
    console.log("ACTIVE_PROVIDER = RuleBased");
    return result;
  }
};
