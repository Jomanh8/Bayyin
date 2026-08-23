import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Base abstract interface for RAG Knowledge Base lookups
 */
export class KnowledgeBaseAdapter {
  async search(query, contractType) {
    throw new Error("Method 'search' must be implemented.");
  }
}

/**
 * Topic Inference Helper: Maps contract clause phrases to controlled topic taxonomy
 */
function inferClauseTopic(query) {
  const text = query.toLowerCase();

  // Working Hours (including weekly rest days "إجازة أسبوعية")
  if (/ساعات العمل|ساعات الدوام|ساعة في اليوم|ساعة يوميا|راحة أسبوعية|إجازة أسبوعية|الراحة الأسبوعية|working hours|hours a day|hours per day|work schedule|weekly rest/i.test(text)) {
    return "working_hours";
  }
  // Annual Leave
  if (/إجازة سنوية|إجازة مدفوعة|رصيد الإجازات|annual leave|paid leave|annual vacation/i.test(text) || (/إجازة|اجازة|عطلة/i.test(text) && !/أسبوعية|مرض|sick|weekly/i.test(text))) {
    return "annual_leave";
  }
  // End of Service Benefits
  if (/مكافأة نهاية الخدمة|نهاية الخدمة|مكافاه نهاية الخدمه|severance|end of service|esb/i.test(text)) {
    return "end_of_service";
  }
  // Probation Period
  if (/تجربة|التجربة|تحت التجربة|probation|trial period|trial/i.test(text)) {
    return "probation";
  }
  // Non-Compete Covenant
  if (/عدم المنافسة|شرط المنافسة|منافس|منافسة|non-compete|non compete|competitor/i.test(text)) {
    return "non_compete";
  }
  // Salary Deductions
  if (/استقطاع|تلف|تلفيات|تدمير|إتلاف|هلاك|damage|destruction|property loss/i.test(text)) {
    return "salary_deductions";
  }
  // Contract Termination
  if (/إنهاء|فصل|فسخ|إنذار|فترة إنذار|مهلة الإنذار|إخطار كتابي|terminate|termination|notice period|dismissal/i.test(text)) {
    return "contract_termination";
  }
  // Base Salary / Wage Payment
  if (/أجر أساسي|راتب أساسي|تحويل الراتب|الحساب البنكي|base salary|monthly salary|bank transfer/i.test(text)) {
    return "salary_payment";
  }
  // Overtime
  if (/ساعات إضافية|ساعة عمل إضافية|العمل الإضافي|أجر إضافي|ساعة ونصف|overtime/i.test(text)) {
    return "overtime";
  }
  // Sick Leave
  if (/إجازة مرضية|إجازات مرضية|مرضي|تقرير طبي|sick leave|medical leave/i.test(text)) {
    return "sick_leave";
  }
  // Employee Duties
  if (/التزامات العامل|واجبات الموظف|سرية المعلومات|الأسرار التجارية|حفظ الأسرار|العناية بالآلات|employee duties|worker obligations|trade secrets/i.test(text)) {
    return "employee_duties";
  }
  // Employer Duties
  if (/التزامات صاحب العمل|واجبات الشركة|حفظ كرامة|الكرامة|كرامتهم|احتجاز الراتب|احتجاز راتبه|الاحترام اللائق|employer duties|employer obligations|dignity/i.test(text)) {
    return "employer_duties";
  }
  return null;
}

/**
 * JSON File-based implementation of the adapter (used for the MVP)
 */
export class JSONKnowledgeBaseAdapter extends KnowledgeBaseAdapter {
  constructor() {
    super();
    this.dataDir = path.join(__dirname, '../data');
  }

  async search(query, contractType) {
    // Map internal contract types to data storage files
    const fileMap = {
      employment: 'employment.json',
      rental: 'rental.json',
      mobile: 'telecom.json',
      subscription: 'subscriptions.json',
      car: 'usedCars.json',
      banking: 'banking.json'
    };

    const fileName = fileMap[contractType];
    if (!fileName) return null;

    const filePath = path.join(this.dataDir, fileName);
    if (!fs.existsSync(filePath)) return null;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Stop-word and generic legal word filters to eliminate noise & generic term score inflation
    const cleanTokens = (text) => {
      const stopwords = new Set([
        "shall", "will", "the", "and", "or", "a", "an", "of", "to", "in", "is", "that", "this", "it", "for", "with", "as", "by", "on", "at",
        "contract", "employee", "employer", "party", "parties", "wage", "wages", "salary", "service", "year", "years", "right", "must",
        "من", "في", "على", "إلى", "عن", "مع", "هذا", "هذه", "أن", "إن", "التي", "الذي", "تم", "كان", "يكون", "البند", "عقد", "العقد",
        "الطرفين", "الطرف", "الأول", "الثاني", "العامل", "صاحب العمل", "الشركة", "الأجر", "الخدمة", "سنة", "سنوات", "التزام", "يلتزم", "حق", "شروط", "يستحق"
      ]);
      const words = text.toLowerCase()
        .replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, ' ')
        .split(/\s+/);
      return words.filter(w => w.length > 1 && !stopwords.has(w));
    };

    const queryTokens = cleanTokens(query);
    const detectedTopic = inferClauseTopic(query);

    let bestMatch = null;
    let maxScore = -1;

    for (const record of data) {
      if (record.status !== "Active") continue;

      let score = 0;

      // Topic Alignment
      if (detectedTopic) {
        if (record.topic === detectedTopic) {
          score += 10.0; // Topic match boost
        } else if (record.topic && record.topic !== detectedTopic) {
          // Penalize topic mismatch to prevent cross-topic false positives
          continue;
        }
      }
      
      const keywordsList = [
        ...(record.keywords || []),
        ...(record.arabicKeywords || []),
        ...(record.englishKeywords || []),
        ...(record.subtopics || [])
      ];

      const enText = `${record.lawName?.en || ''} ${record.articleNumber} ${record.articleTitle?.en || ''} ${record.originalArticleText?.en || ''} ${keywordsList.join(' ')}`.toLowerCase();
      const arText = `${record.lawName?.ar || ''} ${record.articleNumber} ${record.articleTitle?.ar || ''} ${record.originalArticleText?.ar || ''} ${keywordsList.join(' ')}`.toLowerCase();
      const documentText = `${arText} ${enText}`;

      queryTokens.forEach(token => {
        const regex = new RegExp(`\\b${token}\\b`, 'g');
        const matches = documentText.match(regex);
        if (matches) {
          score += matches.length * 1.5;
        } else if (documentText.includes(token)) {
          score += 0.5;
        }
      });

      // Keyword boost for specific legal terms
      if (keywordsList.length > 0) {
        const exactKeywords = keywordsList.filter(kw => query.toLowerCase().includes(kw.toLowerCase()));
        score += exactKeywords.length * 4.0;
      }

      // Exact article number match boost
      const artMatch = query.match(/(?:المادة|article)\s*(\d+)/i);
      if (artMatch) {
        const num = artMatch[1];
        if (record.articleNumber.includes(num)) {
          score += 15.0;
        }
      }

      if (score > maxScore && score > 0) {
        maxScore = score;
        bestMatch = record;
      }
    }

    // Minimum score threshold for safe matching
    const MIN_SCORE_THRESHOLD = 5.0;
    const decision = (bestMatch && maxScore >= MIN_SCORE_THRESHOLD) 
      ? 'matched' 
      : (bestMatch ? 'rejected_low_relevance' : 'no_match');

    // Explainable RAG Telemetry
    console.log(`[RAG Diagnostic] Query Topic: "${detectedTopic || 'Unclassified'}" | Candidate: "${bestMatch ? bestMatch.referenceId : 'None'}" | Score: ${maxScore.toFixed(1)} | Decision: ${decision}`);

    if (decision !== 'matched') {
      return null;
    }

    // Validate reference before returning it
    if (bestMatch) {
      const isValid = validateReference(bestMatch);
      if (!isValid) {
        console.error(`Rejected reference ${bestMatch.referenceId} due to validation mismatch.`);
        return null;
      }
    }

    return bestMatch;
  }
}

/**
 * Strict validator for legal references mapping verification
 */
function validateReference(record) {
  // 1. Verify article number exists and is non-empty
  if (!record.articleNumber || String(record.articleNumber).trim() === "") {
    console.error("Validation failed: Article number is missing or empty.");
    return false;
  }

  const authEn = (record.authority?.en || "").toLowerCase();
  const authAr = (record.authority?.ar || "").toLowerCase();
  const lawEn = (record.lawName?.en || "").toLowerCase();

  // 2. Verify Authority matches URL domain
  if (record.officialUrl) {
    try {
      const domain = new URL(record.officialUrl).hostname.toLowerCase();
      let domainMatch = false;

      if (domain.includes("boe.gov.sa")) {
        domainMatch = authEn.includes("bureau of experts") || authAr.includes("هيئة الخبراء");
      } else if (domain.includes("qiwa.sa")) {
        domainMatch = authEn.includes("qiwa") || authAr.includes("قوى");
      } else if (domain.includes("sama.gov.sa")) {
        domainMatch = authEn.includes("sama") || authEn.includes("central bank") || authAr.includes("البنك المركزي") || authAr.includes("ساما");
      } else if (domain.includes("cst.gov.sa")) {
        domainMatch = authEn.includes("cst") || authEn.includes("space and technology") || authAr.includes("هيئة الاتصالات");
      } else if (domain.includes("mc.gov.sa")) {
        domainMatch = authEn.includes("commerce") || authAr.includes("وزارة التجارة");
      } else if (domain.includes("moj.gov.sa") || domain.includes("najiz.sa")) {
        domainMatch = authEn.includes("justice") || authAr.includes("وزارة العدل");
      }

      if (!domainMatch) {
        console.error(`Validation failed: Authority '${authEn}' does not correspond to URL domain '${domain}'.`);
        return false;
      }
    } catch (e) {
      console.error("Validation failed: Invalid URL structure.", e);
      return false;
    }
  }

  // 3. Verify Law name matches authority responsibilities
  let lawMatch = false;
  if (authEn.includes("bureau of experts") || authEn.includes("qiwa")) {
    lawMatch = lawEn.includes("labor") || lawEn.includes("civil transactions") || lawEn.includes("personal data");
  } else if (authEn.includes("central bank") || authEn.includes("sama")) {
    lawMatch = lawEn.includes("banking") || lawEn.includes("finance");
  } else if (authEn.includes("cst") || authEn.includes("communications")) {
    lawMatch = lawEn.includes("telecom") || lawEn.includes("communications");
  }

  if (!lawMatch) {
    console.error(`Validation failed: Law '${lawEn}' does not match authority scope '${authEn}'.`);
    return false;
  }

  return true;
}

// Instantiate the active adapter configuration
const activeAdapter = new JSONKnowledgeBaseAdapter();

export const searchLegalKnowledgeBase = async (query, contractType) => {
  return await activeAdapter.search(query, contractType);
};
