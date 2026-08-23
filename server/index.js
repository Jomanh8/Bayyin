import './loadEnv.js';

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { extractTextFromBuffer } from './services/documentService.js';
import { searchLegalKnowledgeBase } from './services/ragService.js';
import { analyzeClause, logAudit } from './services/aiService.js';
import { detectContractTypeFromText } from './services/classifierService.js';

export const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

const jobs = {};

/**
 * Heading-Aware Clause Segmentation Engine
 * Splits raw document text into meaningful legal clauses by stitching standalone headings
 * with their immediately following body paragraphs.
 */
export function segmentContractClauses(text) {
  if (!text || typeof text !== 'string') return [];

  // Step 1: Split raw text into initial paragraph blocks
  const rawBlocks = text
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const isStandaloneHeading = (block) => {
    if (block.length > 75 || block.includes('\n')) return false;

    const headingPatterns = [
      /^(?:البند|المادة|القسم|فقرة|شروط|مادة|بند)\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+|[أ-ي]+)/i,
      /^(?:CLAUSE|ARTICLE|SECTION|PARAGRAPH|ITEM)\s+(?:\d+|[A-Z]+|FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)/i,
      /^(?:البند|المادة|القسم|بند|مادة|CLAUSE|ARTICLE|SECTION)\s*:\s*.+$/i
    ];

    return headingPatterns.some(pattern => pattern.test(block));
  };

  const stitchedClauses = [];
  let i = 0;

  while (i < rawBlocks.length) {
    const current = rawBlocks[i];
    const next = i + 1 < rawBlocks.length ? rawBlocks[i + 1] : null;

    if (isStandaloneHeading(current) && next && !isStandaloneHeading(next)) {
      stitchedClauses.push(`${current}\n${next}`);
      i += 2;
    } else {
      if (current.length > 10) {
        stitchedClauses.push(current);
      }
      i++;
    }
  }

  return stitchedClauses;
}

/**
 * Background async process analysis job runner
 */
async function processAnalysisJob(jobId, fileBuffer, fileName, mimetype, contractType) {
  const job = jobs[jobId];
  job.diagnostics = {
    fileReceived: !!fileBuffer,
    fileName: fileName,
    fileSize: fileBuffer ? fileBuffer.length : 0,
    fileExtension: fileName.split('.').pop().toLowerCase(),
    mimeType: mimetype || "unknown",
    methodSelected: "None",
    serviceExecuted: false,
    ocrExecuted: false,
    charCount: 0,
    error: null,
    stack: null
  };
  try {
    // Stage 1: Uploading contract
    job.progress = 10;
    job.stage = 1;
    job.statusAr = "جاري رفع العقد والتحقق من الملف...";
    job.statusEn = "Uploading contract and validating file...";

    await new Promise(r => setTimeout(r, 450));

    // Stage 2: Extracting text & OCR
    job.progress = 20;
    job.stage = 2;
    job.statusAr = "جاري استخراج النصوص...";
    job.statusEn = "Extracting text...";

    job.diagnostics.serviceExecuted = true;
    const docResult = await extractTextFromBuffer(
      fileBuffer, 
      fileName, 
      (percent, msgEn, msgAr) => {
        job.progress = Math.floor(20 + (percent / 100) * 30); // scale 20% to 50%
        job.statusAr = msgAr;
        job.statusEn = msgEn;
      }
    );

    job.diagnostics.methodSelected = docResult.method;
    job.diagnostics.ocrExecuted = docResult.method.includes("OCR");
    job.diagnostics.charCount = docResult.text.length;

    // Save telemetry logs for the developer debug panel
    job.telemetry = {
      method: docResult.method,
      confidence: docResult.confidence,
      pages: docResult.pages,
      language: docResult.language,
      charCount: docResult.text.length,
      detectedType: detectContractTypeFromText(docResult.text)
    };

    // Stage 3: Identifying clauses
    job.progress = 55;
    job.stage = 3;
    job.statusAr = "جاري تفكيك وتحديد البنود...";
    job.statusEn = "Identifying clauses...";

    const text = docResult.text;
    const paragraphs = segmentContractClauses(text);

    if (paragraphs.length === 0) {
      throw new Error("No readable clauses found");
    }

    await new Promise(r => setTimeout(r, 400));

    // Stage 4: Searching official Saudi references (RAG retrieval)
    job.progress = 65;
    job.stage = 4;
    job.statusAr = "البحث في الأنظمة السعودية المعتمدة...";
    job.statusEn = "Searching official Saudi references...";

    logAudit(`RAG Retrieve Job ${jobId} - Querying knowledge base for ${paragraphs.length} paragraphs`);

    const matches = [];
    for (const para of paragraphs) {
      const ref = await searchLegalKnowledgeBase(para, contractType);
      matches.push({ paragraph: para, reference: ref });
      if (ref) {
        logAudit(`RAG Retrieve Job ${jobId} - MATCH SUCCESS: "${para.substring(0, 40).replace(/\n/g, ' ')}..." matched reference ${ref.referenceId} (${ref.articleNumber})`);
      } else {
        logAudit(`RAG Retrieve Job ${jobId} - MATCH FAILED: "${para.substring(0, 40).replace(/\n/g, ' ')}..." no official reference found.`);
      }
    }

    await new Promise(r => setTimeout(r, 400));

    // Stage 5: Running Explainable Legal Analysis
    job.progress = 80;
    job.stage = 5;
    job.statusAr = "جاري إجراء تحليل قانوني مفسّر...";
    job.statusEn = "Running Explainable Legal Analysis...";

    const finalClauses = [];
    let safeCount = 0;
    let attentionCount = 0;
    let riskCount = 0;
    let undocumentedCount = 0;
    const matchedRefIds = new Set();

    for (const match of matches) {
      const para = match.paragraph;
      const ref = match.reference;

      if (ref) {
        if (!matchedRefIds.has(ref.referenceId)) {
          matchedRefIds.add(ref.referenceId);
          
          // Gated AI Call: call AI Provider only if RAG matched
          const analysis = await analyzeClause(para, ref, contractType);
          finalClauses.push(analysis);

          if (analysis.riskLevel === 'safe') safeCount++;
          else if (analysis.riskLevel === 'attention') attentionCount++;
          else if (analysis.riskLevel === 'risk') riskCount++;
        }
      } else {
        // RAG bypass: check for legal indicators in custom clause to index as unregulated
        const legalIndicators = [
          "shall", "must", "agree", "undertake", "obligated", "liable", "responsible", "right to", "force majeure", "exclusive",
          "يلتزم", "يتعهد", "يجب", "حق", "شرط", "مسؤول", "اتفاق", "فسخ", "قانون", "غرامة", "إخلاء"
        ];
        
        const isLegal = legalIndicators.some(ind => {
          const regex = new RegExp(ind, 'i');
          return regex.test(para);
        });

        if (isLegal) {
          undocumentedCount++;
          attentionCount++;

          const customId = `custom_c_${undocumentedCount}`;
          
          // Direct bypass return (no AI Provider called)
          finalClauses.push({
            id: customId,
            title: {
              en: `Unregulated Custom Clause ${undocumentedCount}`,
              ar: `بند مخصص غير منظم ${undocumentedCount}`
            },
            originalText: { en: para, ar: para },
            riskLevel: "attention",
            reasoning: {
              en: "No official Saudi legal reference was found.",
              ar: "لم يتم العثور على مرجع قانوني سعودي رسمي."
            },
            explanation: {
              en: "No official Saudi legal reference was found.",
              ar: "لم يتم العثور على مرجع قانوني سعودي رسمي."
            },
            why: {
              en: "Custom or unregulated clauses can introduce hidden liabilities and may override your statutory rights.",
              ar: "قد تفرض الشروط المخصصة التزامات مالية أو قانونية إضافية وتتعارض مع الضمانات القانونية الافتراضية."
            },
            reasoningPath: {
              en: [
                { step: "Original Clause", desc: "Custom paragraph extracted from contract." },
                { step: "RAG Retrieval", desc: "Searched knowledge base. No official Saudi legal reference was found." },
                { step: "Generated Risk Assessment", desc: "Classified as Needs Attention." }
              ],
              ar: [
                { step: "البند الأصلي", desc: "الفقرة المستخرجة من المستند المرفوع." },
                { step: "استدعاء المرجع (RAG)", desc: "البحث في قاعدة المعرفة. لم يتم العثور على مرجع قانوني سعودي رسمي." },
                { step: "تقييم المخاطر", desc: "تصنيف البند كحاجة انتباه." }
              ]
            },
            reference: {
              authority: { en: "Saudi Legal System", ar: "الأنظمة واللوائح السعودية" },
              lawName: { en: "No Reference Found", ar: "لا يوجد مرجع نظامي" },
              articleNumber: "N/A",
              articleText: {
                en: "No official Saudi legal reference was found.",
                ar: "لم يتم العثور على مرجع قانوني سعودي رسمي."
              },
              article: { en: "N/A", ar: "غير متوفر" },
              section: { en: "N/A", ar: "غير متوفر" },
              officialSourceText: {
                en: "No official Saudi legal reference was found.",
                ar: "لم يتم العثور على مرجع قانوني سعودي رسمي."
              },
              url: ""
            },
            recommendation: {
              en: "Consult a legal professional to ensure this custom clause does not expose you to unexpected liability.",
              ar: "استشر مستشاراً قانونياً مرخصاً للتأكد من عدم وجود ثغرات في هذا الشرط المخصص."
            },
            confidence: {
              level: "low",
              reason: {
                en: "No matched article was found in official Saudi legal references.",
                ar: "لم يتم العثور على أي مادة مطابقة في المراجع النظامية السعودية الرسمية."
              }
            }
          });
        }
      }
    }

    if (finalClauses.length === 0) {
      throw new Error("No readable clauses found");
    }

    // Stage 6: Generating report
    job.progress = 90;
    job.stage = 6;
    job.statusAr = "توليد تقرير تحليل العقد النهائي...";
    job.statusEn = "Generating report...";

    let score = 100 - (riskCount * 25) - (attentionCount * 10) - (undocumentedCount * 15);
    if (score < 0) score = 0;

    let overallStatus = "safe";
    if (riskCount > 0) overallStatus = "risk";
    else if (attentionCount > 0) overallStatus = "attention";

    const topWarnings = finalClauses
      .filter(c => c.riskLevel === 'risk' || c.riskLevel === 'attention')
      .sort((a, b) => {
        if (a.riskLevel === 'risk' && b.riskLevel === 'attention') return -1;
        if (a.riskLevel === 'attention' && b.riskLevel === 'risk') return 1;
        return 0;
      })
      .slice(0, 3)
      .map(c => c.id);

    const checklistEn = [];
    const checklistAr = [];
    
    finalClauses.forEach(c => {
      if (c.riskLevel === 'risk' || c.riskLevel === 'attention') {
        if (c.id.startsWith('custom_c_')) {
          checklistEn.push(`Review custom terms in: "${c.title.en}".`);
          checklistAr.push(`راجع الشروط المخصصة في: "${c.title.ar}".`);
        } else {
          checklistEn.push(`Review contract compliance regarding: "${c.title.en}".`);
          checklistAr.push(`راجع مواءمة البند الخاص بـ: "${c.title.ar}".`);
        }
      }
    });

    if (checklistEn.length === 0) {
      checklistEn.push("Verify contractor identities and check official registry entries.");
      checklistAr.push("تأكد من هويات أطراف التعاقد وراجع بيانات السجل التجاري.");
    }

    const icons = {
      employment: "💼",
      rental: "🏠",
      mobile: "📱",
      subscription: "💳",
      car: "🚗"
    };

    const titles = {
      employment: { en: "Employment Contract", ar: "عقد عمل" },
      rental: { en: "Residential Rental Contract", ar: "عقد إيجار سكني" },
      mobile: { en: "Mobile & Internet Contract", ar: "عقد خدمات الاتصالات والإنترنت" },
      subscription: { en: "Subscription Agreement", ar: "اتفاقية اشتراك خدمات" },
      car: { en: "Used Car Purchase Agreement", ar: "عقد مبايعة سيارة مستعملة" }
    };

    const authorities = {
      employment: { en: "Ministry of Human Resources (MHRSD) / Qiwa", ar: "وزارة الموارد البشرية / قوى" },
      rental: { en: "Ministry of Housing / Ezar", ar: "وزارة الإسكان / إيجار" },
      mobile: { en: "Communications, Space and Technology Commission (CST)", ar: "هيئة الاتصالات والفضاء والتقنية" },
      subscription: { en: "Saudi Central Bank (SAMA) / MoC", ar: "البنك المركزي السعودي (ساما) / التجارة" },
      car: { en: "Ministry of Commerce / Civil Transactions Law", ar: "وزارة التجارة / نظام المعاملات المدنية" }
    };

    const report = {
      title: titles[contractType],
      icon: icons[contractType],
      authority: authorities[contractType],
      sampleDocument: {
        en: text,
        ar: text
      },
      clauses: finalClauses,
      finalReport: {
        overallStatus,
        safetyScore: score,
        stats: {
          total: finalClauses.length,
          safe: safeCount,
          attention: attentionCount,
          risk: riskCount,
          undocumented: undocumentedCount
        },
        topClauses: topWarnings,
        checklist: {
          en: checklistEn,
          ar: checklistAr
        }
      }
    };

    job.progress = 100;
    job.status = 'completed';
    job.report = report;
    job.extractedText = text;

    logAudit(`Job ${jobId} Completed. Clauses: ${finalClauses.length}, Score: ${score}, Status: ${overallStatus.toUpperCase()}`);

  } catch (err) {
    console.error(err);
    job.status = 'failed';
    job.error = err.message || "An unexpected error occurred during processing.";
    job.diagnostics.error = job.error;
    job.diagnostics.stack = err.stack;
    logAudit(`Job ${jobId} Failed. Error: ${job.error}`);
  }
}

app.post('/api/analyze', upload.single('contractFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file was uploaded." });
  }
  const contractType = req.body.contractType || "employment";
  const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  jobs[jobId] = {
    status: 'queued',
    progress: 0,
    statusAr: "جاري رفع العقد والتحقق من الملف...",
    statusEn: "Uploading contract and validating file...",
    stage: 1
  };

  // Run async processing in background thread
  processAnalysisJob(jobId, req.file.buffer, req.file.originalname, req.file.mimetype, contractType);

  res.json({ jobId });
});

app.get('/api/status/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: "Analysis job not found." });
  }
  res.json(job);
});

// Initialize Supabase Admin Client if credentials exist
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    logAudit("Supabase Admin Client initialized successfully.");
  } catch (err) {
    console.error("Failed to load Supabase SDK:", err.message);
  }
}

// Local in-memory fallback store for dev testing when Supabase is not connected
const devSavedAnalysesStore = {};

/**
 * Authentication Middleware: Verifies Supabase Bearer Token
 * Extracts authenticated user ID strictly from JWT (never accepts user_id from body)
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing authentication token." });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired session." });
      }
      req.user = user;
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized: Failed to verify token." });
    }
  }

  // Dev / local mode fallback when live Supabase credentials are not set
  if (token) {
    req.user = {
      id: token.startsWith('dev_') ? token : `dev_user_${token.substring(0, 10)}`,
      email: 'dev@bayyin.sa'
    };
    return next();
  }

  return res.status(401).json({ error: "Unauthorized: Access denied." });
}

// REST Endpoints for Saved Analyses
app.post('/api/analyses/save', requireAuth, async (req, res) => {
  try {
    const { title, contractType, overallStatus, safetyScore, analysis } = req.body;
    const userId = req.user.id; // Strictly from verified JWT token!

    if (!analysis) {
      return res.status(400).json({ error: "Invalid analysis payload." });
    }

    // PRIVACY GUARANTEE: Filter out any file bytes, paths, or binary attachments!
    const cleanAnalysisPayload = {
      title: analysis.title || { en: title, ar: title },
      authority: analysis.authority || {},
      clauses: (analysis.clauses || []).map(c => ({
        id: c.id,
        title: c.title,
        originalText: c.originalText,
        riskLevel: c.riskLevel,
        reasoning: c.reasoning,
        explanation: c.explanation,
        why: c.why,
        reasoningPath: c.reasoningPath,
        reference: c.reference,
        recommendation: c.recommendation,
        confidence: c.confidence
      })),
      finalReport: analysis.finalReport || {},
      stats: analysis.finalReport?.stats || {},
      checklist: analysis.finalReport?.checklist || {}
    };

    const docTitle = title || `تحليل عقد - ${new Date().toLocaleDateString('ar-SA')}`;
    const type = contractType || "employment";
    const status = overallStatus || "attention";
    const score = typeof safetyScore === 'number' ? safetyScore : 70;

    if (supabase) {
      const { data, error } = await supabase
        .from('saved_analyses')
        .insert([{
          user_id: userId,
          title: docTitle,
          contract_type: type,
          overall_status: status,
          safety_score: score,
          analysis_json: cleanAnalysisPayload
        }])
        .select();

      if (error) {
        logAudit(`Supabase Save Error for User ${userId}: ${error.message}`);
        return res.status(500).json({ error: "Failed to save analysis to database." });
      }

      logAudit(`User ${userId} saved analysis ${data[0].id}`);
      return res.json({ success: true, savedAnalysisId: data[0].id, title: docTitle });
    }

    // Fallback Dev Store
    if (!devSavedAnalysesStore[userId]) {
      devSavedAnalysesStore[userId] = [];
    }

    const newSavedItem = {
      id: 'saved_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user_id: userId,
      title: docTitle,
      contract_type: type,
      overall_status: status,
      safety_score: score,
      analysis_json: cleanAnalysisPayload,
      created_at: new Date().toISOString()
    };

    devSavedAnalysesStore[userId].unshift(newSavedItem);
    logAudit(`[Dev Fallback Store] User ${userId} saved analysis ${newSavedItem.id}`);
    return res.json({ success: true, savedAnalysisId: newSavedItem.id, title: docTitle });

  } catch (err) {
    console.error("Save Analysis Error:", err);
    res.status(500).json({ error: "Server error while saving analysis." });
  }
});

app.get('/api/analyses', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    if (supabase) {
      const { data, error } = await supabase
        .from('saved_analyses')
        .select('id, title, contract_type, overall_status, safety_score, created_at, analysis_json')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: "Failed to fetch saved analyses." });
      }
      return res.json({ analyses: data });
    }

    const userAnalyses = (devSavedAnalysesStore[userId] || []).map(item => ({
      id: item.id,
      title: item.title,
      contract_type: item.contract_type,
      overall_status: item.overall_status,
      safety_score: item.safety_score,
      created_at: item.created_at
    }));

    return res.json({ analyses: userAnalyses });

  } catch (err) {
    console.error("List Analyses Error:", err);
    res.status(500).json({ error: "Server error while listing analyses." });
  }
});

app.get('/api/analyses/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const analysisId = req.params.id;

    if (supabase) {
      const { data, error } = await supabase
        .from('saved_analyses')
        .select('*')
        .eq('id', analysisId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Saved analysis not found or access denied." });
      }
      return res.json({ analysis: data });
    }

    const item = (devSavedAnalysesStore[userId] || []).find(a => a.id === analysisId);
    if (!item) {
      return res.status(404).json({ error: "Saved analysis not found." });
    }
    return res.json({ analysis: item });

  } catch (err) {
    console.error("Get Analysis Error:", err);
    res.status(500).json({ error: "Server error while fetching analysis." });
  }
});

app.delete('/api/analyses/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const analysisId = req.params.id;

    if (supabase) {
      const { error } = await supabase
        .from('saved_analyses')
        .delete()
        .eq('id', analysisId)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({ error: "Failed to delete saved analysis." });
      }
      return res.json({ success: true, deletedId: analysisId });
    }

    if (devSavedAnalysesStore[userId]) {
      devSavedAnalysesStore[userId] = devSavedAnalysesStore[userId].filter(a => a.id !== analysisId);
    }
    return res.json({ success: true, deletedId: analysisId });

  } catch (err) {
    console.error("Delete Analysis Error:", err);
    res.status(500).json({ error: "Server error while deleting analysis." });
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test' && process.argv[1] && process.argv[1].includes('index.js')) {
  app.listen(PORT, () => {
    console.log(`Bayyin backend server running on http://localhost:${PORT}`);
  });
}
