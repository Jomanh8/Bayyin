import { validateFileType } from './ocrSimulator.js';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Frontend Client if environment variables exist
const viteSupabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const viteSupabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;
let supabaseClient = null;

if (viteSupabaseUrl && viteSupabaseAnonKey) {
  try {
    supabaseClient = createClient(viteSupabaseUrl, viteSupabaseAnonKey);
    console.log("Supabase Frontend Client initialized successfully.");

    // Automatically synchronize Supabase session with local application state
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        setStoredUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
          token: session.access_token
        });
      }
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        setStoredUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
          token: session.access_token
        });
      } else if (event === 'SIGNED_OUT') {
        setStoredUser(null);
      }
    });
  } catch (err) {
    console.warn("Failed to initialize Supabase client:", err.message);
  }
}

// --- TRANSLATION DICTIONARY ---
const translations = {
  ar: {
    nav_analyze: "حلل عقدك",
    cta_analyze: "ابدأ تحليل العقد الآن",
    features_title: "لماذا منصة بيّن؟",
    features_sub: "مزايا متقدمة لتوفير الحماية والأمان القانوني لالتزاماتك",
    feat1_title: "تحليل مدعوم باللوائح السعودية",
    feat1_desc: "نطابق بنود العقد صراحةً مع الأنظمة الصادرة عن هيئة الخبراء بمجلس الوزراء ووزارة العدل والبنك المركزي وغيرها.",
    feat2_title: "تفسير بتبسيط لغوي",
    feat2_desc: "نحول النصوص القانونية المعقدة إلى شروحات مبسطة ولغة واضحة يفهمها الجميع دون الحاجة لخلفية قانونية.",
    feat3_title: "مسار الاستدلال الشفاف",
    feat3_desc: "نستعرض لك خطوة بخطوة كيف توصل الذكاء الاصطناعي لتصنيف مخاطر البند، وتتبع البند حتى مادته القانونية المعتمدة.",
    how_title: "كيف تعمل المنصة؟",
    how_sub: "ثلاث خطوات بسيطة تفصلك عن حماية نفسك قبل التوقيع",
    step1_title: "اختر نوع العقد",
    step1_desc: "حدد الفئة المناسبة لعقدك (عمل، إيجار، خدمات اتصالات، اشتراكات، سيارة) لتهيئة بيئة الفحص القانوني.",
    step2_title: "ارفع المستند",
    step2_desc: "ارفع عقدك بصيغة PDF أو كصورة. سيقوم النظام ببدء التعرف الضوئي التلقائي لقراءة الكلمات بدقة.",
    step3_title: "اقرأ تقرير التحليل",
    step3_desc: "احصل فوراً على بطاقات البنود المفصلة، ومستوى المخاطر، والوصول المباشر للمرجع الحكومي الرسمي.",
    supported_title: "أنواع العقود المدعومة حالياً",
    supported_sub: "هندسة مرنة مصممة للتوسع وإضافة المزيد من أنواع العقود والأنظمة لاحقاً",
    type_rental: "عقد إيجار سكني",
    type_rental_desc: "مرجع: إيجار / وزارة الإسكان",
    type_employment: "عقد عمل",
    type_employment_desc: "مرجع: وزارة الموارد البشرية / قوى",
    type_mobile: "عقد اتصالات وإنترنت",
    type_mobile_desc: "مرجع: هيئة الاتصالات والفضاء والتقنية",
    type_sub: "اتفاقية اشتراك خدمات",
    type_sub_desc: "مرجع: البنك المركزي (ساما) / التجارة",
    type_car: "مبايعة سيارة مستعملة",
    type_car_desc: "مرجع: وزارة التجارة / المعاملات المدنية",
    sec_title: "الأمن والخصوصية",
    sec_desc: "نحرص على حماية بياناتك وخصوصية مستنداتك، مع تطبيق إجراءات تقنية وتنظيمية مناسبة لحماية البيانات أثناء استخدام المنصة.",
    sec_b1_title: "معالجة آمنة ومشفرة",
    sec_b1_desc: "تتم معالجة نصوص مستنداتك وتشفيرها بالكامل ولا يتم تخزينها أو مشاركتها لأي أغراض تسويقية.",
    sec_b2_title: "معالجة آمنة ومشفرة",
    sec_b2_desc: "تتم معالجة نصوص مستنداتك وتشفيرها بالكامل ولا يتم تخزينها أو مشاركتها لأي أغراض تسويقية.",
    wiz_t1: "اختر نوع العقد المراد تحليله",
    wiz_s1: "يساعد اختيار نوع العقد في مطابقة نصوص البنود بالجهات التنظيمية الصحيحة.",
    wiz_t2: "ارفع ملف العقد الخاص بك",
    wiz_s2: "يرجى إسقاط الملف أدناه. سيقوم النظام باستخراج النصوص وإعدادها للمطابقة اللائحية.",
    wiz_t3: "جاري المعالجة والفحص...",
    wiz_s3: "يقوم الذكاء الاصطناعي بمراجعة المستند ومطابقة بنوده بالمراجع الرسمية.",
    up_title: "اسحب وأفلت ملف العقد هنا",
    up_desc: "ندعم ملفات PDF, DOCX والصور (PNG, JPG, HEIC)",
    up_select: "أو تصفح الملفات",
    wiz_back: "السابق",
    wiz_next: "التالي",
    wiz_demo: "تعبئة نموذج تجريبي",
    doc_viewer_title: "العقد المرفوع",
    score_label: "درجة الأمان",
    status_warning_tip: "ننصح بمراجعة البنود عالية الخطورة والتفاوض مع الطرف الآخر قبل توقيع العقد.",
    stat_total: "إجمالي البنود",
    stat_safe: "بنود آمنة",
    stat_attention: "تحتاج انتباه",
    stat_risk: "مخاطر عالية",
    stat_undoc: "بدون مراجع",
    top_warnings_title: "أهم ٣ بنود ذات تأثير مباشر عليك:",
    clause_breakdown: "التفكيك التفصيلي لبنود العقد",
    checklist_title: "قائمة التدقيق قبل التوقيع",
    checklist_desc: "قائمة مخصصة تم توليدها وتحديثها تلقائياً لمساعدتك أثناء التفاوض:",
    report_print: "طباعة التقرير / تصدير PDF",
    report_new: "تحليل عقد جديد",
    modal_official: "نص تشريعي رسمي معتمد",
    modal_auth: "الجهة التنظيمية",
    modal_section: "الباب / الفصل",
    modal_view_gov: "عرض المرجع الرسمي في منصة الجهة",
    modal_close: "إغلاق",
    foot_home: "الرئيسية",
    foot_analyze: "تحليل العقود",
    disclaimer: "إخلاء مسؤولية قانونية: منصة بيّن (Bayyin) هي منصة إرشادية وتفسيرية تهدف لمساعدة المستخدمين على فهم صياغة العقود وتوضيح مواءمتها للأنظمة واللوائح الرسمية السعودية الموثقة. لا تقدم المنصة استشارات قانونية ملزمة ولا تغني عن استشارة محامٍ مرخص.",
    
    // Risks
    risk_safe: "آمن",
    risk_attention: "يحتاج انتباه",
    risk_risk: "مخاطر عالية",
    risk_badge_text_safe: "البند متوافق",
    risk_badge_text_attention: "يحتاج لمراجعة بسيطة",
    risk_badge_text_risk: "يخالف الأنظمة السعودية",
    
    // Confidence Levels
    conf_high: "مرتفعة",
    conf_medium: "متوسطة",
    conf_low: "منخفضة جداً (لا يوجد مرجع نظامي)",
    experimental_badge: "تجريبي",
    experimental_notice_text: "هذا النوع في وضع تجريبي ولم يتم التحقق من قاعدة المعرفة والمصادر القانونية بالكامل بعد.",

    // Dynamic strings
    alert_ocr_success: "تم استخراج النص بنجاح!",
    alert_ocr_success_sub: "تم إكمال التعرف الضوئي على الكلمات واستخلاص النصوص.",
    alert_ocr_image: "تم تفعيل محرك التعرف الضوئي (OCR) للمستند المصوّر.",
    alert_file_invalid: "نوع الملف غير مدعوم! يرجى رفع ملف بصيغة PDF, DOCX, JPG, PNG أو HEIC.",
    btn_view_source: "عرض المرجع الرسمي",
    btn_source_unavailable: "المرجع الرسمي غير متوفر.",
    timeline_clause: "نص البند التعاقدي",
    timeline_obligation: "الالتزام القانوني المرصود",
    timeline_audit: "مراجعة المطابقة التنظيمية",
    timeline_matched: "المادة القانونية المطابقة",
    timeline_risk: "تقييم المخاطر النهائي",

    // Loading stages
    stage_1: "جاري رفع العقد...",
    stage_2: "جاري استخراج النصوص...",
    stage_3: "جاري تفكيك وتحديد البنود...",
    stage_4: "البحث في الأنظمة السعودية المعتمدة...",
    stage_5: "جاري إجراء تحليل قانوني مفسّر...",
    stage_6: "توليد تقرير تحليل العقد النهائي...",

    // User Accounts & Saved-Analyses
    btn_save_analysis: "حفظ التحليل",
    privacy_notice: "لن يتم حفظ ملف العقد الأصلي. يتم حفظ نتيجة التحليل فقط، ويمكنك حذفها من حسابك في أي وقت.",
    btn_my_analyses: "تحليلاتي",
    tab_my_analyses: "تحليلاتي",
    tab_checklist: "قائمة التدقيق",
    tab_settings: "إعدادات الحساب",
    settings_profile_title: "الملف الشخصي",
    settings_email_title: "تغيير البريد الإلكتروني",
    settings_password_title: "تغيير كلمة المرور",
    btn_save_name: "حفظ الاسم",
    btn_save_email: "تحديث البريد الإلكتروني",
    btn_save_password: "تغيير كلمة المرور",
    btn_change: "تغيير",
    lbl_new_password: "كلمة المرور الجديدة",
    lbl_confirm_password: "تأكيد كلمة المرور الجديدة",
    msg_name_success: "تم تحديث الاسم بنجاح.",
    msg_email_success: "تم إرسال طلب تغيير البريد الإلكتروني. يرجى التحقق من بريدك لتأكيد التغيير.",
    msg_password_success: "تم تغيير كلمة المرور بنجاح.",
    msg_password_mismatch: "كلمات المرور غير متطابقة.",
    msg_password_too_short: "يجب أن تتكون كلمة المرور من 6 خانات على الأقل.",
    btn_sign_in: "تسجيل الدخول",
    btn_register: "إنشاء حساب جديد",
    btn_sign_out: "تسجيل الخروج",
    auth_modal_title_login: "تسجيل الدخول إلى حسابك",
    auth_modal_title_register: "إنشاء حساب جديد في بيّن",
    lbl_email: "البريد الإلكتروني",
    lbl_password: "كلمة المرور",
    lbl_full_name: "الاسم (اختياري)",
    msg_save_success: "تم حفظ نتيجة التحليل في حسابك بنجاح!",
    msg_delete_confirm: "هل أنت تأكد من رغبتك في حذف هذا التحليل المحفوظ؟",
    lbl_saved_analyses_empty: "لا توجد تحليلات محفوظة في حسابك حتى الآن."
  },
  en: {
    nav_analyze: "Analyze Contract",
    cta_analyze: "Analyze Contract",
    features_title: "Why Bayyin?",
    features_sub: "Advanced features guaranteeing legal protection for your commitments",
    feat1_title: "Saudi Regulations Alignment",
    feat1_desc: "We audit contract clauses against laws issued by the Council of Ministers, Ministry of Justice, SAMA, and more.",
    feat2_title: "Plain Language Explanations",
    feat2_desc: "We translate complex legal jargon into simple, clear explanations that anyone can understand without legal background.",
    feat3_title: "Explainable Reasoning Path",
    feat3_desc: "We show step-by-step how the AI evaluated risks, tracing every clause directly back to official legal articles.",
    how_title: "How It Works",
    how_sub: "Three simple steps to protect yourself before signing",
    step1_title: "Select Contract Type",
    step1_desc: "Choose the appropriate contract category (Employment, Rental, Telecom, Subscription, Car) to prepare the legal auditor.",
    step2_title: "Upload Document",
    step2_desc: "Upload your contract in PDF, Word, or image formats. Scanned images are processed via automatic OCR.",
    step3_title: "Read Analysis Report",
    step3_desc: "Get instant clause-by-clause analysis, clear risk badges, and direct links to official governmental regulations.",
    supported_title: "Supported Contract Types",
    supported_sub: "A modular, scalable architecture designed for future expansion of laws and contracts",
    type_rental: "Residential Rental Contract",
    type_rental_desc: "Ref: Ezar / Ministry of Housing",
    type_employment: "Employment Contract",
    type_employment_desc: "Ref: Qiwa / Ministry of Human Resources",
    type_mobile: "Mobile & Internet Contract",
    type_mobile_desc: "Ref: Communications & Space Commission (CST)",
    type_sub: "Subscription Agreement",
    type_sub_desc: "Ref: Saudi Central Bank (SAMA) / MoC",
    type_car: "Used Car Purchase Agreement",
    type_car_desc: "Ref: Ministry of Commerce / Civil Code",
    sec_title: "Security & Privacy",
    sec_desc: "We prioritize protecting your data and document privacy, employing appropriate technical and organizational measures during platform use.",
    sec_b1_title: "Secure & Encrypted Processing",
    sec_b1_desc: "Your document text is encrypted end-to-end and is never saved or shared for marketing purposes.",
    sec_b2_title: "Secure & Encrypted Processing",
    sec_b2_desc: "Your document text is encrypted end-to-end and is never saved or shared for marketing purposes.",
    wiz_t1: "Select Contract Type",
    wiz_s1: "Selecting the correct category allows us to query the relevant Saudi regulatory authorities.",
    wiz_t2: "Upload Contract Document",
    wiz_s2: "Drag and drop your file below. We will extract and process the text content securely.",
    wiz_t3: "Processing and Analyzing...",
    wiz_s3: "The AI is auditing clauses against official Saudi government legal references.",
    up_title: "Drag and Drop Contract File Here",
    up_desc: "Supports PDF, DOCX and Images (PNG, JPG, HEIC)",
    up_select: "Or Browse Files",
    wiz_back: "Back",
    wiz_next: "Next",
    wiz_demo: "Fill Sample Demo",
    doc_viewer_title: "Uploaded Document",
    score_label: "Safety Score",
    status_warning_tip: "We recommend reviewing high-risk clauses and negotiating changes before signing the agreement.",
    stat_total: "Analyzed Clauses",
    stat_safe: "Safe Clauses",
    stat_attention: "Attention Required",
    stat_risk: "High Risk",
    stat_undoc: "No Legal Reference",
    top_warnings_title: "Top 3 clauses with the highest impact on you:",
    clause_breakdown: "Clause-by-Clause Analysis breakdown",
    checklist_title: "Before You Sign Checklist",
    checklist_desc: "A personalized checklist updated in real-time to guide your negotiation:",
    report_print: "Print Report / Export PDF",
    report_new: "Analyze Another Contract",
    modal_official: "Official Legislative Text",
    modal_auth: "Government Authority",
    modal_section: "Chapter / Section",
    modal_view_gov: "View Reference on Portal",
    modal_close: "Close",
    foot_home: "Home",
    foot_analyze: "Analyze",
    disclaimer: "Legal Disclaimer: Bayyin is an explainable informational tool designed to help users understand contract terms in relation to Saudi regulations. It does not provide binding legal counsel, legal advice, or substitute for a licensed attorney.",
    
    // Risks
    risk_safe: "Safe",
    risk_attention: "Needs Attention",
    risk_risk: "High Risk",
    risk_badge_text_safe: "Clause is compliant",
    risk_badge_text_attention: "Requires review",
    risk_badge_text_risk: "Conflicts with Saudi regulations",

    // Confidence Levels
    conf_high: "High",
    conf_medium: "Medium",
    conf_low: "Very Low (No Legal Reference)",
    experimental_badge: "Experimental",
    experimental_notice_text: "This contract type is in experimental mode and its legal knowledge base is not fully verified yet.",

    // Dynamic strings
    alert_ocr_success: "Text extracted successfully!",
    alert_ocr_success_sub: "Document structure parsed and text segments compiled.",
    alert_ocr_image: "OCR engine successfully read the scanned/image file.",
    alert_file_invalid: "Unsupported file type! Please upload a PDF, DOCX, JPG, PNG, or HEIC file.",
    btn_view_source: "View Official Source",
    btn_source_unavailable: "Official source unavailable.",
    timeline_clause: "Original Contract Clause",
    timeline_obligation: "Detected Obligation",
    timeline_audit: "Saudi Regulation Audit",
    timeline_matched: "Matched Legal Article",
    timeline_risk: "Risk Assessment",

    // Loading stages
    stage_1: "Uploading contract...",
    stage_2: "Extracting text...",
    stage_3: "Identifying clauses...",
    stage_4: "Searching official Saudi references...",
    stage_5: "Running Explainable Legal Analysis...",
    stage_6: "Generating report...",

    // User Accounts & Saved-Analyses
    btn_save_analysis: "Save Analysis",
    privacy_notice: "The original contract file is not stored. Only the analysis result is saved, and you can delete it from your account at any time.",
    btn_my_analyses: "My Analyses",
    tab_my_analyses: "My Analyses",
    tab_checklist: "Pre-Signing Checklist",
    tab_settings: "Account Settings",
    settings_profile_title: "Profile Information",
    settings_email_title: "Change Email",
    settings_password_title: "Change Password",
    btn_save_name: "Save Name",
    btn_save_email: "Update Email",
    btn_save_password: "Change Password",
    btn_change: "Change",
    lbl_new_password: "New Password",
    lbl_confirm_password: "Confirm New Password",
    msg_name_success: "Name updated successfully.",
    msg_email_success: "Email update request sent. Please check your inbox to confirm.",
    msg_password_success: "Password changed successfully.",
    msg_password_mismatch: "Passwords do not match.",
    msg_password_too_short: "Password must be at least 6 characters long.",
    btn_sign_in: "Sign In",
    btn_register: "Create Account",
    btn_sign_out: "Sign Out",
    auth_modal_title_login: "Sign In to Your Account",
    auth_modal_title_register: "Create a New Bayyin Account",
    lbl_email: "Email",
    lbl_password: "Password",
    lbl_full_name: "Full Name (Optional)",
    msg_save_success: "Analysis result saved successfully to your account!",
    msg_delete_confirm: "Are you sure you want to delete this saved analysis?",
    lbl_saved_analyses_empty: "No saved analyses found in your account yet."
  }
};

// --- APP STATE ---
const state = {
  lang: 'ar', // ar, en
  theme: 'light', // light, dark
  currentView: 'landing', // landing, dashboard, results
  wizardStep: 1,
  selectedType: null,
  uploadedFile: null,
  extractedText: "",
  isOcrApplied: false,
  analysisReport: null,
  checklistStatus: {}, // id -> boolean
  extractionMethod: "",
  ocrConfidence: 100,
  pagesProcessed: 1,
  detectedLanguage: "",
  isSavingAnalysis: false,
  isAnalysisSaved: false
};

// Cancel handler for step 3 loading
let activePipelineCancelFn = null;

// --- DOM ELEMENTS CACHE ---
const elements = {
  body: document.body,
  html: document.documentElement,
  
  // Navigation
  navLogo: document.getElementById('nav-logo'),
  langToggleBtn: document.getElementById('lang-toggle-btn'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  headerCtaBtn: document.getElementById('header-cta-btn'),
  footerLogoLink: document.getElementById('footer-logo-link'),
  footerLandingLink: document.getElementById('footer-landing-link'),
  footerAnalyzeLink: document.getElementById('footer-analyze-link'),
  
  // Views
  viewLanding: document.getElementById('view-landing'),
  viewDashboard: document.getElementById('view-dashboard'),
  viewResults: document.getElementById('view-results'),
  viewAccount: document.getElementById('view-account'),
  
  // Landing elements
  landingCtaBtn: document.getElementById('landing-cta-btn'),
  contractTypeCards: document.querySelectorAll('.contract-type-card'),
  
  // Wizard elements
  wizardTitle: document.getElementById('wizard-title'),
  wizardSubtitle: document.getElementById('wizard-subtitle'),
  step1: document.getElementById('step-content-1'),
  step2: document.getElementById('step-content-2'),
  step3: document.getElementById('step-content-3'),
  indStep1: document.getElementById('ind-step-1'),
  indStep2: document.getElementById('ind-step-2'),
  indStep3: document.getElementById('ind-step-3'),
  selectTypeButtons: document.querySelectorAll('.select-type-btn'),
  dropZone: document.getElementById('drop-zone'),
  fileSelector: document.getElementById('file-selector'),
  fileCard: document.getElementById('file-card'),
  fileNameDisplay: document.getElementById('file-name-display'),
  fileSizeDisplay: document.getElementById('file-size-display'),
  fileRemoveBtn: document.getElementById('file-remove-btn'),
  statusMainText: document.getElementById('status-main-text'),
  statusSubText: document.getElementById('status-sub-text'),
  analysisLogSteps: document.getElementById('analysis-log-steps'),
  wizPrevBtn: document.getElementById('wiz-prev-btn'),
  wizNextBtn: document.getElementById('wiz-next-btn'),
  
  // Results Dashboard elements
  reportBackBtn: document.getElementById('report-back-btn'),
  docViewerText: document.getElementById('doc-viewer-text'),
  docTypeBadge: document.getElementById('doc-type-badge'),
  scoreGauge: document.getElementById('score-gauge'),
  scoreTextVal: document.getElementById('score-text-val'),
  reportStatusBadge: document.getElementById('report-status-badge'),
  reportStatusText: document.getElementById('report-status-text'),
  reportStatusDesc: document.getElementById('report-status-desc'),
  statTotal: document.getElementById('stat-total'),
  statSafe: document.getElementById('stat-safe'),
  statAttention: document.getElementById('stat-attention'),
  statRisk: document.getElementById('stat-risk'),
  statUndocumented: document.getElementById('stat-undocumented'),
  topWarningsListEl: document.getElementById('top-warnings-list-el'),
  topWarningsBox: document.getElementById('top-warnings-box'),
  clauseCardsContainer: document.getElementById('clause-cards-container'),
  reportChecklistContainer: document.getElementById('report-checklist-container'),
  reportPrintBtn: document.getElementById('report-print-btn'),
  reportRestartBtn: document.getElementById('report-restart-btn'),
  
  // Modal elements
  sourceModal: document.getElementById('source-modal'),
  modalLawTitle: document.getElementById('modal-law-title'),
  modalSourceText: document.getElementById('modal-source-text'),
  modalMetaAuthority: document.getElementById('modal-meta-authority'),
  modalMetaSection: document.getElementById('modal-meta-section'),
  modalLinkBtn: document.getElementById('modal-link-btn'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalCloseActionBtn: document.getElementById('modal-close-action-btn')
};

// --- INITIALIZE ---
function init() {
  bindEvents();
  applyLanguage();
  applyTheme();

  // Hide developer debug panel unless ?debug=true is passed
  const urlParams = new URLSearchParams(window.location.search);
  const isDebug = urlParams.get('debug') === 'true';
  const devPanel = document.getElementById('dev-debug-panel');
  if (devPanel) {
    devPanel.style.display = isDebug ? 'block' : 'none';
  }
}

// --- BIND EVENT HANDLERS ---
function bindEvents() {
  elements.navLogo.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('landing');
  });
  if (elements.footerLogoLink) {
    elements.footerLogoLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('landing');
    });
  }
  if (elements.footerLandingLink) {
    elements.footerLandingLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('landing');
    });
  }
  elements.footerAnalyzeLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('dashboard');
  });
  elements.headerCtaBtn.addEventListener('click', () => switchView('dashboard'));
  elements.landingCtaBtn.addEventListener('click', () => switchView('dashboard'));

  // Language Switch
  elements.langToggleBtn.addEventListener('click', toggleLanguage);

  // Theme Toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Landing Page Cards
  elements.contractTypeCards.forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-type');
      selectContractType(type);
      switchView('dashboard');
      goToWizardStep(2);
    });
  });

  // Step 1 buttons
  elements.selectTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      selectContractType(type);
    });
  });

  // Step 2 Upload zone
  const dropZone = elements.dropZone;
  dropZone.addEventListener('click', () => elements.fileSelector.click());
  
  elements.fileSelector.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  elements.fileRemoveBtn.addEventListener('click', removeUploadedFile);

  // Wizard Nav
  elements.wizPrevBtn.addEventListener('click', handleWizardPrev);
  elements.wizNextBtn.addEventListener('click', handleWizardNext);

  // Results Back Navigation
  elements.reportBackBtn.addEventListener('click', () => {
    // Go back to Step 2, keeping selected type and uploaded file intact
    switchView('dashboard');
    goToWizardStep(2);
  });

  // Results actions
  elements.reportPrintBtn.addEventListener('click', () => window.print());
  elements.reportRestartBtn.addEventListener('click', () => {
    restartAnalysisWizard();
    switchView('dashboard');
  });

  // Modal
  elements.modalCloseBtn.addEventListener('click', closeModal);
  elements.modalCloseActionBtn.addEventListener('click', closeModal);
  elements.sourceModal.addEventListener('click', (e) => {
    if (e.target === elements.sourceModal) closeModal();
  });

  // Save Analysis Button
  const reportSaveBtn = document.getElementById('report-save-btn');
  if (reportSaveBtn) {
    reportSaveBtn.addEventListener('click', handleSaveAnalysisBtnClick);
  }

  // Navigation Account Button
  const navAccountBtn = document.getElementById('nav-account-btn');
  if (navAccountBtn) {
    navAccountBtn.addEventListener('click', async () => {
      const authToken = await getActiveAuthToken();
      if (!authToken) {
        openAuthModal('login');
        return;
      }
      switchView('account');
    });
  }

  setupAccountTabs();

  // Auth Modal Buttons & Form
  const authTabLogin = document.getElementById('auth-tab-login');
  const authTabRegister = document.getElementById('auth-tab-register');
  const authForm = document.getElementById('auth-form');
  const authModalCloseBtn = document.getElementById('auth-modal-close-btn');

  if (authTabLogin) authTabLogin.addEventListener('click', () => openAuthModal('login'));
  if (authTabRegister) authTabRegister.addEventListener('click', () => openAuthModal('register'));
  if (authForm) authForm.addEventListener('submit', handleAuthSubmit);
  if (authModalCloseBtn) authModalCloseBtn.addEventListener('click', closeAuthModal);

  // My Analyses Modal Close
  const myAnalysesCloseBtn = document.getElementById('my-analyses-close-btn');
  const myAnalysesCloseActionBtn = document.getElementById('my-analyses-close-action-btn');
  if (myAnalysesCloseBtn) myAnalysesCloseBtn.addEventListener('click', closeMyAnalysesModal);
  if (myAnalysesCloseActionBtn) myAnalysesCloseActionBtn.addEventListener('click', closeMyAnalysesModal);

  // Initialize Auth UI state
  updateAuthUI();
}

// --- VIEW CONFIGURATION ---
function switchView(viewName) {
  state.currentView = viewName;
  
  elements.viewLanding.classList.remove('active');
  elements.viewDashboard.classList.remove('active');
  elements.viewResults.classList.remove('active');
  if (elements.viewAccount) elements.viewAccount.classList.remove('active');
  
  if (viewName === 'landing') {
    elements.viewLanding.classList.add('active');
    restartAnalysisWizard();
  } else if (viewName === 'dashboard') {
    elements.viewDashboard.classList.add('active');
  } else if (viewName === 'results') {
    elements.viewResults.classList.add('active');
  } else if (viewName === 'account') {
    if (elements.viewAccount) elements.viewAccount.classList.add('active');
    loadMyAnalyses();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectContractType(type) {
  state.selectedType = type;
  elements.selectTypeButtons.forEach(btn => {
    if (btn.getAttribute('data-type') === type) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
  updateWizardButtons();
}

function handleSelectedFile(file) {
  if (!validateFileType(file.name)) {
    alert(translations[state.lang].alert_file_invalid);
    return;
  }

  state.uploadedFile = file;
  
  const sizeKb = file.size / 1024;
  const sizeDisplay = sizeKb > 1000 
    ? `${(sizeKb / 1024).toFixed(1)} MB` 
    : `${sizeKb.toFixed(0)} KB`;
  
  elements.fileNameDisplay.textContent = file.name;
  elements.fileSizeDisplay.textContent = sizeDisplay;
  
  const fileInfoIcon = elements.fileCard.querySelector('.file-info .icon i');
  const ext = file.name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'heic'].includes(ext)) {
    fileInfoIcon.className = "fa-regular fa-file-image";
  } else if (ext === 'docx') {
    fileInfoIcon.className = "fa-regular fa-file-word";
  } else {
    fileInfoIcon.className = "fa-regular fa-file-pdf";
  }

  elements.fileCard.style.display = 'flex';
  elements.dropZone.style.display = 'none';

  updateWizardButtons();
}

function removeUploadedFile(e) {
  if (e) e.stopPropagation();
  state.uploadedFile = null;
  elements.fileSelector.value = '';
  elements.fileCard.style.display = 'none';
  elements.dropZone.style.display = 'block';
  updateWizardButtons();
}

// --- WIZARD SYSTEM ---
function handleWizardPrev() {
  if (state.wizardStep === 1) {
    switchView('landing');
  } else if (state.wizardStep > 1) {
    goToWizardStep(state.wizardStep - 1);
  }
}

function handleWizardNext() {
  if (state.wizardStep === 1 && state.selectedType) {
    goToWizardStep(2);
  } else if (state.wizardStep === 2 && state.uploadedFile) {
    goToWizardStep(3);
    runAnalysisWorkflow();
  }
}

function goToWizardStep(step) {
  state.wizardStep = step;
  
  elements.step1.style.display = 'none';
  elements.step2.style.display = 'none';
  elements.step3.style.display = 'none';
  
  elements.indStep1.className = 'indicator-step';
  elements.indStep2.className = 'indicator-step';
  elements.indStep3.className = 'indicator-step';

  // Make Back button visible in step 1 to navigate back to Landing Page
  elements.wizPrevBtn.style.visibility = 'visible';

  if (step === 1) {
    elements.step1.style.display = 'block';
    elements.indStep1.classList.add('active');
    elements.wizardTitle.textContent = translations[state.lang].wiz_t1;
    elements.wizardSubtitle.textContent = translations[state.lang].wiz_s1;
  } else if (step === 2) {
    elements.step2.style.display = 'block';
    elements.indStep1.classList.add('completed');
    elements.indStep2.classList.add('active');
    elements.wizardTitle.textContent = translations[state.lang].wiz_t2;
    elements.wizardSubtitle.textContent = translations[state.lang].wiz_s2;
  } else if (step === 3) {
    elements.step3.style.display = 'block';
    elements.indStep1.classList.add('completed');
    elements.indStep2.classList.add('completed');
    elements.indStep3.classList.add('active');
    elements.wizardTitle.textContent = translations[state.lang].wiz_t3;
    elements.wizardSubtitle.textContent = translations[state.lang].wiz_s3;
  }
  
  updateWizardButtons();
}

function updateWizardButtons() {
  if (state.wizardStep === 1) {
    elements.wizNextBtn.disabled = !state.selectedType;
  } else if (state.wizardStep === 2) {
    elements.wizNextBtn.disabled = !state.uploadedFile;
  } else {
    // During active loading, allow Back button to act as a cancel function
    elements.wizNextBtn.disabled = true;
  }
}

// --- REAL DYNAMIC PIPELINE ---
function runAnalysisWorkflow() {
  // Clear steps list logs
  elements.analysisLogSteps.innerHTML = "";
  
  // Show spinner, remove warning icons
  elements.step3.querySelector('.loading-spinner-container').innerHTML = `
    <div class="loading-ring"></div>
    <div class="loading-center"><i class="fa-solid fa-microchip-ai"></i></div>
  `;

  // Load the 6 analysis log nodes visually
  const logItems = [];
  for (let i = 1; i <= 6; i++) {
    const li = appendAnalysisLogStep(translations[state.lang][`stage_${i}`], false);
    logItems.push(li);
  }

  let pollingInterval = null;
  let pipelineActive = true;

  activePipelineCancelFn = () => {
    pipelineActive = false;
    if (pollingInterval) clearInterval(pollingInterval);
    activePipelineCancelFn = null;
  };

  // Start with stage 1 highlight
  logItems[0].className = "analysis-step-log active";
  elements.statusMainText.textContent = translations[state.lang].stage_1;
  elements.statusSubText.textContent = "";

  const formData = new FormData();
  formData.append('contractFile', state.uploadedFile);
  formData.append('contractType', state.selectedType);

  fetch('/api/analyze', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("upload_failed");
    }
    return response.json();
  })
  .then(data => {
    if (!pipelineActive) return;
    const jobId = data.jobId;

    pollingInterval = setInterval(() => {
      if (!pipelineActive) {
        clearInterval(pollingInterval);
        return;
      }

      fetch(`/api/status/${jobId}`)
      .then(res => res.json())
      .then(job => {
        if (!pipelineActive) return;

        if (job.status === 'completed') {
          clearInterval(pollingInterval);
          activePipelineCancelFn = null;

          logItems.forEach(li => li.className = "analysis-step-log completed");
          
          state.extractedText = job.extractedText;
          state.analysisReport = job.report;
          state.extractionMethod = job.telemetry.method;
          state.ocrConfidence = job.telemetry.confidence;
          state.pagesProcessed = job.telemetry.pages;
          state.detectedLanguage = job.telemetry.language;
          state.detectedType = job.telemetry.detectedType;

          renderResultsView();
          switchView('results');

        } else if (job.status === 'failed') {
          clearInterval(pollingInterval);
          const errType = job.error === "This document could not be read accurately." ? "unreadable" : "ocr_failed";
          showPipelineError(errType, job.diagnostics);

        } else {
          elements.statusMainText.textContent = state.lang === 'ar' ? job.statusAr : job.statusEn;
          elements.statusSubText.textContent = `${job.progress}%`;

          const activeStage = job.stage || 1;
          for (let i = 0; i < 6; i++) {
            if (i + 1 < activeStage) {
              logItems[i].className = "analysis-step-log completed";
            } else if (i + 1 === activeStage) {
              logItems[i].className = "analysis-step-log active";
            } else {
              logItems[i].className = "analysis-step-log";
            }
          }
        }
      })
      .catch(err => {
        console.error("Status polling failed:", err);
      });
    }, 500);
  })
  .catch(err => {
    if (!pipelineActive) return;
    console.error("Upload failed:", err);
    const clientDiagnostics = {
      fileReceived: false,
      fileName: state.uploadedFile.name,
      fileSize: state.uploadedFile.size,
      fileExtension: state.uploadedFile.name.split('.').pop(),
      mimeType: state.uploadedFile.type || "unknown",
      methodSelected: "None",
      serviceExecuted: false,
      ocrExecuted: false,
      charCount: 0,
      error: err.message || "Network Error / Connection Refused",
      stack: err.stack
    };
    showPipelineError("ocr_failed", clientDiagnostics);
  });
}

function showPipelineError(errType, diagnostics) {
  // Clear pipeline callback
  if (activePipelineCancelFn) activePipelineCancelFn();

  // Set warning layout
  elements.step3.querySelector('.loading-spinner-container').innerHTML = `
    <i class="fa-solid fa-triangle-exclamation" style="color: var(--risk); font-size: 3.5rem;"></i>
  `;

  // Display specific translated error message
  if (diagnostics && diagnostics.error) {
    elements.statusMainText.textContent = diagnostics.error;
  } else if (errType === "unreadable") {
    elements.statusMainText.textContent = state.lang === 'ar'
      ? "عذراً، لم نتمكن من قراءة هذا المستند بدقة."
      : "This document could not be read accurately.";
  } else if (errType === "empty_text") {
    elements.statusMainText.textContent = state.lang === 'ar' 
      ? "لم يتم استخراج أي نصوص مقروءة من هذا المستند." 
      : "No readable text could be extracted from this document.";
  } else if (errType === "ocr_failed") {
    elements.statusMainText.textContent = state.lang === 'ar' 
      ? "لم نتمكن من استخراج النص من هذا الملف." 
      : "Text could not be extracted from this file.";
  } else {
    elements.statusMainText.textContent = state.lang === 'ar'
      ? "عذراً، لم نتمكن من تحليل هذا العقد. يرجى رفع مستند مدعوم ومقروء."
      : "Unable to analyze this contract. Please upload a supported and readable document.";
  }

  elements.statusSubText.textContent = "";

  // Remove existing diagnostic box if any
  const oldDiag = elements.step3.querySelector('.diagnostic-box');
  if (oldDiag) oldDiag.remove();

  // Render diagnostics box if telemetry details exist and debug is enabled
  const urlParams = new URLSearchParams(window.location.search);
  const isDebug = urlParams.get('debug') === 'true';
  if (diagnostics && isDebug) {
    const diagBox = document.createElement('div');
    diagBox.className = 'diagnostic-box';
    diagBox.style.marginTop = '24px';
    diagBox.style.padding = '16px';
    diagBox.style.backgroundColor = 'var(--background)';
    diagBox.style.border = '1px solid var(--border)';
    diagBox.style.borderRadius = '8px';
    diagBox.style.textAlign = 'start';
    diagBox.style.fontFamily = 'monospace';
    diagBox.style.fontSize = '0.8rem';
    diagBox.style.color = 'var(--text)';
    diagBox.style.width = '100%';
    diagBox.style.maxWidth = '600px';
    diagBox.style.marginInline = 'auto';

    diagBox.innerHTML = `
      <h4 style="margin-top:0; color: var(--risk); font-size: 0.9rem; border-bottom: 1px solid var(--border); padding-bottom: 6px; display: flex; align-items: center; gap: 8px;">
        <i class="fa-solid fa-bug"></i> Pipeline Diagnostics / تشخيصات المعالجة
      </h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 8px;">
        <div><strong>Backend Received:</strong> ${diagnostics.fileReceived ? "✅ Yes" : "❌ No"}</div>
        <div><strong>File Name:</strong> ${diagnostics.fileName}</div>
        <div><strong>File Size:</strong> ${diagnostics.fileSize} bytes</div>
        <div><strong>Extension:</strong> ${diagnostics.fileExtension.toUpperCase()}</div>
        <div><strong>MIME Type:</strong> ${diagnostics.mimeType}</div>
        <div><strong>Method Selected:</strong> ${diagnostics.methodSelected}</div>
        <div><strong>Service Executed:</strong> ${diagnostics.serviceExecuted ? "✅ Yes" : "❌ No"}</div>
        <div><strong>OCR Executed:</strong> ${diagnostics.ocrExecuted ? "✅ Yes" : "❌ No"}</div>
        <div><strong>Chars Extracted:</strong> ${diagnostics.charCount}</div>
      </div>
      <div style="margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px; color: var(--risk);">
        <strong>Error details:</strong> ${diagnostics.error || "None"}
      </div>
      ${diagnostics.stack ? `
        <div style="margin-top: 12px;">
          <strong>Stack Trace (Dev Mode):</strong>
          <pre style="margin-top: 6px; padding: 10px; background-color: #2a1c1c; color: #ffb5b5; overflow-x: auto; font-size: 0.75rem; border-radius: 4px; max-height: 150px; text-align: left; direction: ltr;">${diagnostics.stack}</pre>
        </div>
      ` : ""}
    `;
    elements.step3.querySelector('.loading-view').appendChild(diagBox);
  }
  
  // Enable the "Back" button in Step 3 footer to allow users to retry
  elements.wizPrevBtn.style.visibility = 'visible';
  // Bind click on prev button to return to Step 2
  elements.wizPrevBtn.onclick = () => {
    elements.wizPrevBtn.onclick = null; // Unbind
    const diag = elements.step3.querySelector('.diagnostic-box');
    if (diag) diag.remove();
    goToWizardStep(2);
  };
}

function appendAnalysisLogStep(text, isCompleted) {
  const logEl = document.createElement('div');
  logEl.className = isCompleted ? "analysis-step-log completed" : "analysis-step-log";
  logEl.innerHTML = `
    <div class="dot"></div>
    <span>${text}</span>
  `;
  elements.analysisLogSteps.appendChild(logEl);
  return logEl;
}

// --- RENDER DYNAMIC RESULTS ---
function renderResultsView() {
  const report = state.analysisReport;
  const isAr = state.lang === 'ar';
  
  if (!report) return;

  // Left Pane (Document Viewer)
  elements.docViewerText.textContent = state.extractedText || "";

  const titleText = typeof report.title === 'string'
    ? report.title
    : (report.title?.[state.lang] || report.title?.ar || report.title?.en || '');
  elements.docTypeBadge.textContent = titleText;

  // Populate Validation Panel directly from the uploaded file
  const detectedLang = state.detectedLanguage === 'Arabic' ? 'ar' : 'en';
  const detectedType = state.detectedType || state.selectedType || 'employment';

  if (document.getElementById('val-doc-lang')) {
    document.getElementById('val-doc-lang').textContent = detectedLang === 'ar' ? 'العربية (Arabic)' : 'English (الإنجليزية)';
  }
  if (document.getElementById('val-doc-length')) {
    document.getElementById('val-doc-length').textContent = state.extractedText ? state.extractedText.length : 0;
  }

  const typeLabels = {
    employment: { en: "Employment Contract", ar: "عقد عمل" },
    rental: { en: "Residential Rental Contract", ar: "عقد إيجار سكني" },
    mobile: { en: "Mobile & Internet Contract", ar: "عقد خدمات الاتصالات والإنترنت" },
    subscription: { en: "Subscription Agreement", ar: "اتفاقية اشتراك خدمات" },
    car: { en: "Used Car Purchase Agreement", ar: "عقد مبايعة سيارة مستعملة" }
  };
  const typeObj = typeLabels[detectedType] || typeLabels.employment;
  if (document.getElementById('val-doc-type')) {
    document.getElementById('val-doc-type').textContent = typeObj[state.lang] || typeObj.ar;
  }

  // Populate Developer Debug Panel
  if (document.getElementById('dbg-file-name')) {
    document.getElementById('dbg-file-name').textContent = state.uploadedFile ? state.uploadedFile.name : (isAr ? "تحليل محفوظ" : "Saved Analysis");
  }
  if (document.getElementById('dbg-method')) {
    document.getElementById('dbg-method').textContent = state.extractionMethod || (isAr ? "سجل قاعدة البيانات" : "Database Record");
  }
  if (document.getElementById('dbg-confidence')) {
    document.getElementById('dbg-confidence').textContent = state.ocrConfidence === 100 ? "100% (Direct)" : `${Math.round(state.ocrConfidence)}%`;
  }
  if (document.getElementById('dbg-char-count')) {
    document.getElementById('dbg-char-count').textContent = `${state.extractedText ? state.extractedText.length : 0} characters`;
  }
  if (document.getElementById('dbg-pages')) {
    document.getElementById('dbg-pages').textContent = `${state.pagesProcessed || 1} page(s)`;
  }
  if (document.getElementById('dbg-lang')) {
    document.getElementById('dbg-lang').textContent = state.detectedLanguage || (isAr ? "العربية" : "Arabic");
  }

  // Score circular meter
  const score = report.finalReport.safetyScore;
  elements.scoreTextVal.textContent = score;
  
  const circumference = 339.29;
  const offset = circumference - (score / 100) * circumference;
  elements.scoreGauge.style.strokeDashoffset = offset;
  
  if (score >= 75) {
    elements.scoreGauge.style.stroke = "var(--safe)";
  } else if (score >= 50) {
    elements.scoreGauge.style.stroke = "var(--attention)";
  } else {
    elements.scoreGauge.style.stroke = "var(--risk)";
  }

  // Report status banner
  const status = report.finalReport.overallStatus;
  elements.reportStatusBadge.className = `status-badge ${status}`;
  
  let statusIcon = "fa-circle-check";
  let statusLabel = translations[state.lang].risk_safe;
  if (status === 'attention') {
    statusIcon = "fa-circle-info";
    statusLabel = translations[state.lang].risk_attention;
  } else if (status === 'risk') {
    statusIcon = "fa-triangle-exclamation";
    statusLabel = translations[state.lang].risk_risk;
  }
  
  elements.reportStatusBadge.innerHTML = `
    <i class="fa-solid ${statusIcon}"></i>
    <span>${statusLabel}</span>
  `;

  // Status descriptor texts
  if (status === 'safe') {
    elements.reportStatusDesc.textContent = isAr 
      ? "هذا العقد آمن بشكل عام ومتوافق مع الأنظمة السعودية الصادرة." 
      : "This contract is generally safe and complies with applicable Saudi regulations.";
  } else if (status === 'attention') {
    elements.reportStatusDesc.textContent = isAr 
      ? "يحتوي العقد على بنود تحتاج إلى مراجعة وتعديل بسيط قبل التوقيع." 
      : "The contract contains clauses that require review and minor modification before signing.";
  } else {
    elements.reportStatusDesc.textContent = isAr 
      ? "تنبيه! يحتوي العقد على بنود عالية الخطورة تخالف صراحة الأنظمة السعودية المعتمدة." 
      : "Warning! The contract contains high-risk clauses that conflict directly with official Saudi laws.";
  }

  // Stats
  elements.statTotal.textContent = report.finalReport.stats.total;
  elements.statSafe.textContent = report.finalReport.stats.safe;
  elements.statAttention.textContent = report.finalReport.stats.attention;
  elements.statRisk.textContent = report.finalReport.stats.risk;
  elements.statUndocumented.textContent = report.finalReport.stats.undocumented;

  // Important warning cards
  const warningsList = elements.topWarningsListEl;
  warningsList.innerHTML = "";
  
  const criticalClauses = report.clauses.filter(c => c.riskLevel === 'risk' || c.riskLevel === 'attention');
  
  if (criticalClauses.length > 0) {
    elements.topWarningsBox.style.display = 'block';
    
    const hasOnlyAttention = criticalClauses.every(c => c.riskLevel === 'attention');
    if (hasOnlyAttention) {
      elements.topWarningsBox.className = "top-warnings-container attention-only";
    } else {
      elements.topWarningsBox.className = "top-warnings-container";
    }

    criticalClauses.slice(0, 3).forEach(c => {
      const li = document.createElement('li');
      li.className = "top-warning-item";
      
      const iconColor = c.riskLevel === 'risk' ? 'var(--risk)' : 'var(--attention)';
      const iconType = c.riskLevel === 'risk' ? 'fa-circle-xmark' : 'fa-circle-exclamation';
      
      li.innerHTML = `
        <span class="bullet" style="color: ${iconColor};"><i class="fa-solid ${iconType}"></i></span>
        <div>
          <strong>${c.title[state.lang]}</strong>
          <p style="font-size: 0.85rem; margin-top: 4px;">${c.why[state.lang]}</p>
        </div>
      `;

      li.addEventListener('click', () => {
        const cardEl = document.getElementById(`clause-card-${c.id}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (!cardEl.classList.contains('expanded')) {
            toggleClauseCard(c.id);
          }
        }
      });

      warningsList.appendChild(li);
    });
  } else {
    elements.topWarningsBox.style.display = 'none';
  }

  // Expandable Clause Cards
  const cardsContainer = elements.clauseCardsContainer;
  cardsContainer.innerHTML = "";

  report.clauses.forEach(c => {
    const cardEl = document.createElement('div');
    cardEl.className = `clause-card ${c.riskLevel}-border`;
    cardEl.id = `clause-card-${c.id}`;

    const riskLabel = translations[state.lang][`risk_${c.riskLevel}`];
    const riskBadgeSubText = translations[state.lang][`risk_badge_text_${c.riskLevel}`];

    const reasoningNodes = c.reasoningPath[state.lang];
    let reasoningTimelineHtml = "";
    
    reasoningNodes.forEach((node, idx) => {
      const isActive = idx === reasoningNodes.length - 1 ? 'active' : '';
      reasoningTimelineHtml += `
        <div class="timeline-item ${isActive}">
          <div class="timeline-node"></div>
          <div class="timeline-content">
            <strong>${node.step}</strong>
            <span>${node.desc}</span>
          </div>
        </div>
      `;
    });

    // Check if official URL link is valid (not #)
    const isUrlAvailable = c.reference.url && c.reference.url !== "#";

    cardEl.innerHTML = `
      <div class="clause-header" data-clause-id="${c.id}">
        <div class="clause-header-left">
          <span class="risk-pill ${c.riskLevel}">${riskLabel}</span>
          <span class="clause-title">${c.title[state.lang]}</span>
        </div>
        <span class="chevron-icon"><i class="fa-solid fa-chevron-down"></i></span>
      </div>
      
      <div class="clause-body">
        
        <div class="analysis-sub-section">
          <div class="analysis-sub-title" style="color: var(--text-secondary);">${translations[state.lang].timeline_clause}</div>
          <div class="original-clause-quote">"${c.originalText[state.lang]}"</div>
        </div>

        <div class="analysis-sub-section">
          <div class="analysis-sub-title" style="color: var(--primary);">${isAr ? "الشرح باللغة البسيطة" : "Plain Language Explanation"}</div>
          <p><strong>${riskBadgeSubText}:</strong> ${c.explanation[state.lang]}</p>
        </div>

        <div class="analysis-sub-section">
          <div class="analysis-sub-title">${isAr ? "لماذا يؤثر هذا البند عليك؟" : "Why does this affect you?"}</div>
          <p>${c.why[state.lang]}</p>
        </div>

        <div class="analysis-sub-section">
          <div class="analysis-sub-title">${isAr ? "مسار الاستدلال للذكاء الاصطناعي" : "AI Reasoning Path"}</div>
          <div class="timeline-container">
            ${reasoningTimelineHtml}
          </div>
        </div>

        <div class="analysis-sub-section">
          <div class="analysis-sub-title">${isAr ? "المرجع النظامي الرسمي المعتمد" : "Official Legal Reference"}</div>
          <div class="reference-card">
            <div class="reference-info">
              <h5>${c.reference.lawName[state.lang]}</h5>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                <div><strong>${isAr ? "الجهة الحكومية:" : "Government Authority:"}</strong> ${c.reference.authority[state.lang]}</div>
                <div><strong>${isAr ? "المادة:" : "Article Number:"}</strong> ${c.reference.article[state.lang]}</div>
                <div><strong>${isAr ? "المصدر الرسمي:" : "Official Source:"}</strong> <code>${isUrlAvailable ? new URL(c.reference.url).hostname : (isAr ? "غير متوفر" : "Unavailable")}</code></div>
              </div>
            </div>
            
            ${isUrlAvailable ? `
              <button class="btn btn-secondary btn-small view-source-btn" data-clause-id="${c.id}">
                <i class="fa-solid fa-arrow-up-right-from-square" style="color: var(--primary); font-size: 0.8rem; margin-inline-end: 4px;"></i>
                <span>${translations[state.lang].btn_view_source}</span>
              </button>
            ` : `
              <span class="risk-pill" style="background-color: var(--border); color: var(--text-secondary); border: 1px solid var(--border);">
                ${translations[state.lang].btn_source_unavailable}
              </span>
            `}
          </div>
        </div>

        <div class="analysis-sub-section">
          <div class="analysis-sub-title">${isAr ? "التوصية القانونية المقترحة" : "Recommended Action"}</div>
          <p style="color: var(--text); background-color: rgba(var(--primary-rgb), 0.03); border: 1px solid var(--border); padding: 16px; border-radius: 12px;">
            <i class="fa-regular fa-lightbulb" style="color: var(--primary); margin-inline-end: 8px;"></i>
            ${c.recommendation[state.lang]}
          </p>
        </div>

        <div class="analysis-sub-section">
          <div class="analysis-sub-title">${isAr ? "درجة اليقين والموثوقية" : "Confidence Assessment"}</div>
          <div class="confidence-bar-wrapper">
            <div class="confidence-bar-bg">
              <div class="confidence-bar-fill ${c.confidence.level}"></div>
            </div>
            <span class="confidence-lbl ${c.confidence.level}">
              ${translations[state.lang][`conf_${c.confidence.level}`]}
            </span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${c.confidence.reason[state.lang]}</p>
        </div>

      </div>
    `;

    const cardHeader = cardEl.querySelector('.clause-header');
    cardHeader.addEventListener('click', () => {
      toggleClauseCard(c.id);
    });

    const sourceBtn = cardEl.querySelector('.view-source-btn');
    if (sourceBtn) {
      sourceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openOfficialSourceModal(c.id);
      });
    }

    cardsContainer.appendChild(cardEl);
  });

  // Single source of truth Checklist rendering
  renderChecklist(elements.reportChecklistContainer);
}

async function fetchSavedAnalysesIfNeeded(forceRefresh = false) {
  if (!forceRefresh && Array.isArray(state.savedAnalysesList) && state.savedAnalysesList.length > 0) {
    return state.savedAnalysesList;
  }
  const authToken = await getActiveAuthToken();
  if (!authToken) return [];
  try {
    const res = await fetch('/api/analyses', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      state.savedAnalysesList = data.analyses || [];
      return state.savedAnalysesList;
    }
  } catch (e) {
    console.warn("Failed to fetch saved analyses for checklist:", e);
  }
  return state.savedAnalysesList || [];
}

function getActiveAnalysisId() {
  if (state.currentAnalysisId) return state.currentAnalysisId;
  if (state.analysisReport && state.analysisReport.id) return state.analysisReport.id;
  return 'active';
}

function getStoredChecklistState(analysisId) {
  const targetId = analysisId || getActiveAnalysisId();
  const key = `bayyin_checklist_state_${targetId}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveStoredChecklistState(analysisId, stateMap) {
  const targetId = analysisId || getActiveAnalysisId();
  const key = `bayyin_checklist_state_${targetId}`;
  try {
    localStorage.setItem(key, JSON.stringify(stateMap));
  } catch (e) {
    console.warn("Failed to persist checklist state:", e);
  }
}

function extractChecklistArray(data, lang = 'ar') {
  if (!data) return [];
  
  if (Array.isArray(data)) {
    return data.filter(item => typeof item === 'string' && item.trim().length > 0);
  }
  
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return extractChecklistArray(parsed, lang);
    } catch (e) {
      return data.trim().length > 0 ? [data.trim()] : [];
    }
  }

  if (typeof data === 'object') {
    const langItems = data[lang] || data.ar || data.en;
    if (langItems) {
      const result = extractChecklistArray(langItems, lang);
      if (result.length > 0) return result;
    }

    if (data.finalReport) {
      const result = extractChecklistArray(data.finalReport.checklist || data.finalReport, lang);
      if (result.length > 0) return result;
    }

    if (data.checklist) {
      const result = extractChecklistArray(data.checklist, lang);
      if (result.length > 0) return result;
    }

    if (data.report) {
      const result = extractChecklistArray(data.report, lang);
      if (result.length > 0) return result;
    }
  }

  return [];
}

async function renderChecklist(targetContainer = null) {
  const container = targetContainer || elements.reportChecklistContainer;
  if (!container) return;

  const currentLang = state.lang || 'ar';
  const isAccountTab = (container === document.getElementById('account-checklist-box'));

  // Show inline spinner for account tab if analyses list has not loaded yet
  if (isAccountTab && !state.analysisReport && !state.savedAnalysesList) {
    container.innerHTML = `
      <div style="text-align: center; padding: 36px 20px; color: var(--text-secondary);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; margin-bottom: 12px; color: var(--primary);"></i>
        <p style="margin: 0; font-size: 0.9rem;">${currentLang === 'ar' ? 'جاري تحميل قائمة التدقيق...' : 'Loading checklist...'}</p>
      </div>
    `;
  }

  // Ensure saved analyses are pre-fetched if needed
  const savedItems = await fetchSavedAnalysesIfNeeded();

  // Build array of available candidate contracts containing valid checklist items
  const candidates = [];

  // 1. Check active in-memory analysis report
  if (state.analysisReport) {
    const activeItems = extractChecklistArray(state.analysisReport, currentLang);
    if (activeItems.length > 0) {
      candidates.push({
        id: state.analysisReport.id || state.currentAnalysisId || 'active',
        title: typeof state.analysisReport.title === 'string'
          ? state.analysisReport.title
          : (state.analysisReport.title?.[currentLang] || state.analysisReport.title?.ar || state.analysisReport.title?.en || (currentLang === 'ar' ? 'التحليل الحالي' : 'Active Analysis')),
        items: activeItems,
        isCurrent: true
      });
    }
  }

  // 2. Add saved analyses from backend
  for (const item of savedItems) {
    // Avoid duplicate if active analysis shares the same ID
    if (candidates.some(c => c.id === item.id)) continue;

    let json = item.analysis_json;
    if (typeof json === 'string') {
      try { json = JSON.parse(json); } catch (e) {}
    }

    const savedChecklistItems = extractChecklistArray(json || item, currentLang);
    if (savedChecklistItems.length > 0) {
      candidates.push({
        id: item.id,
        title: item.title || (currentLang === 'ar' ? 'تحليل محفوظ' : 'Saved Analysis'),
        items: savedChecklistItems,
        isCurrent: false
      });
    }
  }

  container.innerHTML = "";

  if (candidates.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 36px 20px; color: var(--text-secondary);">
        <i class="fa-solid fa-list-check" style="font-size: 2.5rem; opacity: 0.5; margin-bottom: 12px; color: var(--primary);"></i>
        <h4 style="margin: 0 0 6px 0; color: var(--text); font-size: 1.05rem;">${currentLang === 'ar' ? 'لا توجد قائمة تدقيق نشطة حالياً' : 'No active checklist available'}</h4>
        <p style="margin: 0 0 16px 0; font-size: 0.85rem;">${currentLang === 'ar' ? 'قم بتحليل عقد جديد أو اختيار تحليل محفوظ من "تحليلاتي" لإظهار قائمة التدقيق لقبل التوقيع.' : 'Analyze a contract or open a saved analysis from My Analyses to display its pre-signing checklist.'}</p>
      </div>
    `;
    return;
  }

  // Determine target selected candidate
  let activeCandidate = candidates.find(c => c.id === state.selectedChecklistAnalysisId) || candidates[0];
  state.selectedChecklistAnalysisId = activeCandidate.id;

  // Render container content
  const wrapper = document.createElement('div');

  // If rendering inside Account page checklist box and multiple candidates exist, render explicit contract selector
  if (isAccountTab && candidates.length > 1) {
    const selectorHeader = document.createElement('div');
    selectorHeader.style.cssText = "display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 12px;";

    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = "display: flex; align-items: center; gap: 8px;";
    labelDiv.innerHTML = `
      <i class="fa-solid fa-file-contract" style="color: var(--primary); font-size: 1.1rem;"></i>
      <span style="font-weight: 600; font-size: 0.95rem; color: var(--text);">${currentLang === 'ar' ? 'العقد المختار:' : 'Selected Contract:'}</span>
    `;

    const selectEl = document.createElement('select');
    selectEl.id = "account-checklist-contract-select";
    selectEl.style.cssText = "padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 0.9rem; font-family: inherit; cursor: pointer; max-width: 340px;";

    candidates.forEach(cand => {
      const opt = document.createElement('option');
      opt.value = cand.id;
      opt.textContent = cand.title + (cand.isCurrent ? ` (${currentLang === 'ar' ? 'النشط حالياً' : 'Active'})` : '');
      if (cand.id === activeCandidate.id) opt.selected = true;
      selectEl.appendChild(opt);
    });

    selectEl.addEventListener('change', (e) => {
      state.selectedChecklistAnalysisId = e.target.value;
      renderChecklist(container);
    });

    selectorHeader.appendChild(labelDiv);
    selectorHeader.appendChild(selectEl);
    wrapper.appendChild(selectorHeader);
  }

  // Saved Analysis Title as main heading + "قائمة تدقيق قبل التوقيع" subtitle
  if (isAccountTab) {
    const headerEl = document.createElement('div');
    headerEl.className = "account-checklist-header";
    headerEl.style.cssText = "margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border);";
    
    const titleEl = document.createElement('h3');
    titleEl.className = "account-checklist-contract-title";
    titleEl.style.cssText = "margin: 0 0 6px 0; font-size: 1.2rem; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 10px;";
    titleEl.innerHTML = `
      <i class="fa-solid fa-file-contract" style="color: var(--primary);"></i>
      <span>${activeCandidate.title}</span>
    `;

    const subTitleEl = document.createElement('div');
    subTitleEl.className = "account-checklist-subtitle";
    subTitleEl.style.cssText = "font-size: 0.88rem; color: var(--text-secondary); font-weight: 500; display: flex; align-items: center; gap: 6px;";
    subTitleEl.innerHTML = `
      <i class="fa-solid fa-list-check" style="color: var(--primary); opacity: 0.8;"></i>
      <span>${currentLang === 'ar' ? 'قائمة تدقيق قبل التوقيع' : 'Pre-Signing Checklist'}</span>
    `;

    headerEl.appendChild(titleEl);
    headerEl.appendChild(subTitleEl);
    wrapper.appendChild(headerEl);
  }

  // Load checked states for the selected analysis ID
  const checkedMap = getStoredChecklistState(activeCandidate.id);

  const listEl = document.createElement('ul');
  listEl.className = "checklist";

  activeCandidate.items.forEach((itemText, idx) => {
    const li = document.createElement('li');
    li.className = "checklist-item";
    
    if (Boolean(checkedMap[idx])) {
      li.classList.add('checked');
    }
    
    li.innerHTML = `
      <div class="checklist-checkbox"></div>
      <span class="checklist-text">${itemText}</span>
    `;

    li.addEventListener('click', () => {
      const nowChecked = !li.classList.contains('checked');
      if (nowChecked) {
        li.classList.add('checked');
        checkedMap[idx] = true;
      } else {
        li.classList.remove('checked');
        checkedMap[idx] = false;
      }

      saveStoredChecklistState(activeCandidate.id, checkedMap);

      if (elements.reportChecklistContainer && elements.reportChecklistContainer !== container) {
        renderChecklist(elements.reportChecklistContainer);
      }
      const accBox = document.getElementById('account-checklist-box');
      if (accBox && accBox !== container) {
        renderChecklist(accBox);
      }
    });

    listEl.appendChild(li);
  });

  wrapper.appendChild(listEl);
  container.appendChild(wrapper);
}

function toggleClauseCard(clauseId) {
  const cardEl = document.getElementById(`clause-card-${clauseId}`);
  if (!cardEl) return;

  const isExpanded = cardEl.classList.contains('expanded');
  
  if (isExpanded) {
    cardEl.classList.remove('expanded');
    cardEl.querySelector('.clause-body').style.display = 'none';
  } else {
    cardEl.classList.add('expanded');
    cardEl.querySelector('.clause-body').style.display = 'block';
  }
}

// --- MODAL CONTROLS ---
function openOfficialSourceModal(clauseId) {
  const c = state.analysisReport.clauses.find(item => item.id === clauseId);
  if (!c) return;

  const ref = c.reference;
  elements.modalLawTitle.textContent = `${ref.lawName[state.lang]} - ${ref.article[state.lang]}`;
  elements.modalSourceText.textContent = ref.officialSourceText[state.lang];
  elements.modalMetaAuthority.textContent = ref.authority[state.lang];
  elements.modalMetaSection.textContent = ref.section[state.lang];
  
  elements.modalLinkBtn.href = ref.url;
  elements.sourceModal.classList.add('active');
}

function closeModal() {
  elements.sourceModal.classList.remove('active');
}

function restartAnalysisWizard() {
  // Clear active pipeline run
  if (activePipelineCancelFn) activePipelineCancelFn();

  state.selectedType = null;
  state.uploadedFile = null;
  state.analysisReport = null;
  state.extractedText = "";
  state.isOcrApplied = false;
  state.wizardStep = 1;
  state.extractionMethod = "";
  state.ocrConfidence = 100;
  state.pagesProcessed = 1;
  state.detectedLanguage = "";
  state.isSavingAnalysis = false;
  state.isAnalysisSaved = false;
  
  const saveBtn = document.getElementById('report-save-btn');
  const saveBtnText = document.getElementById('report-save-btn-text');
  if (saveBtn) saveBtn.disabled = false;
  if (saveBtnText) saveBtnText.textContent = translations[state.lang].btn_save_analysis;

  elements.selectTypeButtons.forEach(btn => btn.classList.remove('selected'));
  removeUploadedFile();
  
  goToWizardStep(1);
}

// --- LOCALIZATION & DIRECTIONALITY ---
function toggleLanguage() {
  state.lang = state.lang === 'ar' ? 'en' : 'ar';
  applyLanguage();
}

function applyLanguage() {
  const isAr = state.lang === 'ar';
  
  elements.body.setAttribute('dir', isAr ? 'rtl' : 'ltr');
  elements.html.setAttribute('lang', isAr ? 'ar' : 'en');
  
  elements.langToggleBtn.textContent = isAr ? 'English' : 'العربية';

  document.querySelectorAll('[data-localize]').forEach(el => {
    const key = el.getAttribute('data-localize');
    if (translations[state.lang][key]) {
      el.textContent = translations[state.lang][key];
    }
  });

  const landingTagline = document.getElementById('landing-tagline');
  const landingSubtagline = document.getElementById('landing-subtagline');
  if (isAr) {
    landingTagline.textContent = "اعرف ما توقّع عليه قبل أن توقّع";
    landingSubtagline.textContent = "بيّن هي منصتك الذكية الموثوقة لتفسير وتحليل عقودك ومقارنتها بالأنظمة واللوائح المعمول بها في المملكة العربية السعودية قبل تصدِيقها.";
  } else {
    landingTagline.textContent = "Understand Before You Sign";
    landingSubtagline.textContent = "Bayyin is your trusted explainable contract analyzer. We audit and map your contract terms directly against statutory Saudi government regulations before you sign.";
  }

  // Update back buttons label inside navigation or wizards
  goToWizardStep(state.wizardStep);

  if (state.analysisReport) {
    renderResultsView();
  }
}

// --- DARK / LIGHT THEME TOGGLE ---
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
}

function applyTheme() {
  elements.html.setAttribute('data-theme', state.theme);
  const icon = elements.themeToggleBtn.querySelector('i');
  if (state.theme === 'dark') {
    icon.className = 'fa-solid fa-sun';
  } else {
    icon.className = 'fa-solid fa-moon';
  }
}

// --- AUTHENTICATION & SAVED ANALYSES MODULE ---

function getStoredUser() {
  try {
    const raw = localStorage.getItem('bayyin_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setStoredUser(user) {
  state.currentUser = user;
  if (user) {
    localStorage.setItem('bayyin_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('bayyin_user');
  }
  updateAuthUI();
}

function updateAuthUI() {
  const isAr = state.lang === 'ar';
  const navAuthBtn = document.getElementById('nav-auth-btn');
  const navAuthIcon = document.getElementById('nav-auth-icon');
  const navAccountBtn = document.getElementById('nav-account-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const langToggleBtn = document.getElementById('lang-toggle-btn');

  if (themeToggleBtn) {
    themeToggleBtn.title = state.theme === 'dark' 
      ? (isAr ? "الوضع الفاتح" : "Light Mode") 
      : (isAr ? "الوضع الداكن" : "Dark Mode");
  }

  if (langToggleBtn) {
    langToggleBtn.title = isAr ? "تغيير اللغة إلى الإنجليزية" : "Switch language to Arabic";
  }

  if (state.currentUser) {
    if (navAccountBtn) {
      navAccountBtn.style.display = 'inline-flex';
      navAccountBtn.title = isAr ? "حسابي" : "My Account";
    }
    if (navAuthBtn) {
      navAuthBtn.title = isAr ? "تسجيل الخروج" : "Sign Out";
      navAuthBtn.onclick = handleSignOut;
    }
    if (navAuthIcon) {
      navAuthIcon.className = "fa-solid fa-right-from-bracket";
    }
  } else {
    if (navAccountBtn) {
      navAccountBtn.style.display = 'none';
    }
    if (navAuthBtn) {
      navAuthBtn.title = isAr ? "تسجيل الدخول" : "Sign In";
      navAuthBtn.onclick = () => openAuthModal('login');
    }
    if (navAuthIcon) {
      navAuthIcon.className = "fa-solid fa-arrow-right-to-bracket";
    }
  }
}

function setupAccountTabs() {
  const tabAnalyses = document.getElementById('account-tab-analyses');
  const tabChecklist = document.getElementById('account-tab-checklist');
  const tabSettings = document.getElementById('account-tab-settings');

  const contentAnalyses = document.getElementById('account-content-analyses');
  const contentChecklist = document.getElementById('account-content-checklist');
  const contentSettings = document.getElementById('account-content-settings');

  const tabs = [
    { btn: tabAnalyses, content: contentAnalyses, action: () => loadMyAnalyses() },
    { btn: tabChecklist, content: contentChecklist, action: () => renderChecklist(document.getElementById('account-checklist-box')) },
    { btn: tabSettings, content: contentSettings, action: () => populateSettingsForm() }
  ];

  tabs.forEach(tab => {
    if (tab.btn) {
      tab.btn.addEventListener('click', () => {
        tabs.forEach(t => {
          if (t.btn) {
            t.btn.classList.remove('active');
            t.btn.style.borderBottom = '3px solid transparent';
            t.btn.style.color = 'var(--text-secondary)';
          }
          if (t.content) t.content.style.display = 'none';
        });

        tab.btn.classList.add('active');
        tab.btn.style.borderBottom = '3px solid var(--primary)';
        tab.btn.style.color = 'var(--primary)';
        if (tab.content) tab.content.style.display = 'block';

        if (tab.action) tab.action();
      });
    }
  });

  // Bind settings form submit handlers
  const profileForm = document.getElementById('settings-profile-form');
  const emailForm = document.getElementById('settings-email-form');
  const passwordForm = document.getElementById('settings-password-form');

  if (profileForm) profileForm.addEventListener('submit', handleSettingsSaveName);
  if (emailForm) emailForm.addEventListener('submit', handleSettingsSaveEmail);
  if (passwordForm) passwordForm.addEventListener('submit', handleSettingsSavePassword);

  // Bind inline edit toggle buttons
  document.querySelectorAll('.toggle-edit-btn').forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.getAttribute('data-target');
      const formEl = document.getElementById(targetId);
      if (formEl) {
        const isHidden = formEl.style.display === 'none' || !formEl.style.display;
        formEl.style.display = isHidden ? 'block' : 'none';
      }
    };
  });
}

function populateSettingsForm() {
  const nameInput = document.getElementById('settings-name-input');
  const emailInput = document.getElementById('settings-email-input');
  const currentName = document.getElementById('settings-current-name');
  const currentEmail = document.getElementById('settings-current-email');
  const feedback = document.getElementById('settings-feedback-msg');

  if (feedback) feedback.style.display = 'none';
  if (nameInput) nameInput.value = state.currentUser?.name || '';
  if (emailInput) emailInput.value = state.currentUser?.email || '';
  if (currentName) currentName.textContent = state.currentUser?.name || (state.lang === 'ar' ? 'غير محدد' : 'Not set');
  if (currentEmail) currentEmail.textContent = state.currentUser?.email || (state.lang === 'ar' ? 'غير محدد' : 'Not set');
}

function showSettingsFeedback(message, isError = false) {
  const feedback = document.getElementById('settings-feedback-msg');
  if (!feedback) return;

  feedback.style.display = 'block';
  if (isError) {
    feedback.style.background = 'rgba(196, 69, 54, 0.12)';
    feedback.style.color = 'var(--risk)';
    feedback.style.border = '1px solid var(--risk)';
    feedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${message}`;
  } else {
    feedback.style.background = 'rgba(46, 139, 87, 0.12)';
    feedback.style.color = 'var(--safe)';
    feedback.style.border = '1px solid var(--safe)';
    feedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${message}`;
  }
}

async function handleSettingsSaveName(e) {
  e.preventDefault();
  const nameInput = document.getElementById('settings-name-input');
  const submitBtn = document.getElementById('settings-save-name-btn');
  const newName = nameInput?.value ? nameInput.value.trim() : '';

  if (!newName) return;
  if (submitBtn) submitBtn.disabled = true;

  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.updateUser({
        data: { full_name: newName }
      });
      if (error) throw error;
    }

    setStoredUser({ ...state.currentUser, name: newName });
    showSettingsFeedback(translations[state.lang].msg_name_success, false);
  } catch (err) {
    showSettingsFeedback(err.message || (state.lang === 'ar' ? "فشل تحديث الاسم." : "Failed to update name."), true);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleSettingsSaveEmail(e) {
  e.preventDefault();
  const emailInput = document.getElementById('settings-email-input');
  const submitBtn = document.getElementById('settings-save-email-btn');
  const newEmail = emailInput?.value ? emailInput.value.trim().toLowerCase() : '';

  if (!newEmail) return;
  if (submitBtn) submitBtn.disabled = true;

  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.updateUser({
        email: newEmail
      });
      if (error) throw error;
    }

    setStoredUser({ ...state.currentUser, email: newEmail });
    showSettingsFeedback(translations[state.lang].msg_email_success, false);
  } catch (err) {
    showSettingsFeedback(err.message || (state.lang === 'ar' ? "فشل تحديث البريد الإلكتروني." : "Failed to update email."), true);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleSettingsSavePassword(e) {
  e.preventDefault();
  const passInput = document.getElementById('settings-password-input');
  const confirmInput = document.getElementById('settings-password-confirm-input');
  const submitBtn = document.getElementById('settings-save-password-btn');

  const pass = passInput?.value || '';
  const confirmPass = confirmInput?.value || '';

  if (pass.length < 6) {
    showSettingsFeedback(translations[state.lang].msg_password_too_short, true);
    return;
  }

  if (pass !== confirmPass) {
    showSettingsFeedback(translations[state.lang].msg_password_mismatch, true);
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.updateUser({
        password: pass
      });
      if (error) throw error;
    }

    if (passInput) passInput.value = '';
    if (confirmInput) confirmInput.value = '';
    showSettingsFeedback(translations[state.lang].msg_password_success, false);
  } catch (err) {
    showSettingsFeedback(err.message || (state.lang === 'ar' ? "فشل تغيير كلمة المرور." : "Failed to update password."), true);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

let authMode = 'login'; // 'login' | 'register'

function openAuthModal(mode = 'login') {
  authMode = mode;
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-modal-title');
  const nameGroup = document.getElementById('auth-name-group');
  const submitText = document.getElementById('auth-submit-text');
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');
  const errorMsg = document.getElementById('auth-error-msg');

  if (errorMsg) {
    errorMsg.style.display = 'none';
    errorMsg.textContent = '';
  }

  if (mode === 'register') {
    if (title) title.textContent = translations[state.lang].auth_modal_title_register;
    if (submitText) submitText.textContent = translations[state.lang].btn_register;
    if (nameGroup) nameGroup.style.display = 'block';
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegister) tabRegister.classList.add('active');
  } else {
    if (title) title.textContent = translations[state.lang].auth_modal_title_login;
    if (submitText) submitText.textContent = translations[state.lang].btn_sign_in;
    if (nameGroup) nameGroup.style.display = 'none';
    if (tabLogin) tabLogin.classList.add('active');
    if (tabRegister) tabRegister.classList.remove('active');
  }

  if (modal) modal.style.display = 'flex';
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById('auth-email-input');
  const passwordInput = document.getElementById('auth-password-input');
  const nameInput = document.getElementById('auth-name-input');
  const errorMsg = document.getElementById('auth-error-msg');
  const submitBtn = document.getElementById('auth-submit-btn');

  const email = emailInput?.value ? emailInput.value.trim().toLowerCase() : '';
  const password = passwordInput?.value || '';
  const name = nameInput?.value ? nameInput.value.trim() : '';

  if (!email || !password) {
    if (errorMsg) {
      errorMsg.style.color = 'var(--risk)';
      errorMsg.textContent = state.lang === 'ar' ? "يرجى كتابة البريد الإلكتروني وكلمة المرور." : "Please enter email and password.";
      errorMsg.style.display = 'block';
    }
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    if (supabaseClient) {
      if (authMode === 'register') {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { data: { full_name: name || '' } }
        });
        if (error) throw error;
        const user = data.user;
        const session = data.session;
        if (session) {
          setStoredUser({
            id: user.id,
            email: user.email,
            name: name || user.email.split('@')[0],
            token: session.access_token
          });
        } else if (user && !user.email_confirmed_at) {
          if (errorMsg) {
            errorMsg.style.color = 'var(--attention)';
            errorMsg.textContent = state.lang === 'ar'
              ? "تم إنشاء الحساب بنجاح! إذا كانت خاصية تأكيد البريد مفعلة، يرجى التحقق من بريدك قبل تسجيل الدخول."
              : "Account created successfully! If email confirmation is enabled, please check your inbox before logging in.";
            errorMsg.style.display = 'block';
          }
          return;
        }
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        const user = data.user;
        const session = data.session;
        setStoredUser({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email.split('@')[0],
          token: session.access_token
        });
      }
    } else {
      const mockToken = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const userSession = {
        id: mockToken,
        email: email,
        name: name || email.split('@')[0],
        token: mockToken
      };

      setStoredUser(userSession);
    }

    closeAuthModal();

    if (state.pendingSave) {
      state.pendingSave = false;
      await executeSaveAnalysis();
    }
  } catch (err) {
    if (errorMsg) {
      errorMsg.style.color = 'var(--risk)';
      let msg = err.message || "An authentication error occurred.";
      if (err.message === "Invalid login credentials") {
        msg = state.lang === 'ar'
          ? "بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور وتأكيد الحساب."
          : "Invalid login credentials. Please check your email, password, or confirm your email.";
      }
      errorMsg.textContent = msg;
      errorMsg.style.display = 'block';
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleSignOut() {
  if (supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch (e) {
      console.warn("Signout warning:", e);
    }
  }
  setStoredUser(null);
  alert(state.lang === 'ar' ? "تم تسجيل الخروج بنجاح." : "Signed out successfully.");
}

function showToastNotification(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const isError = type === 'error';
  toast.style.cssText = `
    background-color: ${isError ? '#dc2626' : '#059669'};
    color: #ffffff;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 0.9rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s ease;
    pointer-events: auto;
  `;

  const iconClass = isError ? 'fa-triangle-exclamation' : 'fa-circle-check';
  toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

async function handleSaveAnalysisBtnClick() {
  if (!state.analysisReport) return;

  // Prevent duplicate rapid clicks or duplicate submissions
  if (state.isSavingAnalysis) return;
  if (state.isAnalysisSaved) {
    showToastNotification(
      state.lang === 'ar' ? "تم حفظ هذا التحليل في حسابك مسبقاً." : "This analysis is already saved in your account.",
      'success'
    );
    return;
  }

  if (!state.currentUser) {
    state.pendingSave = true;
    openAuthModal('login');
    return;
  }

  await executeSaveAnalysis();
}

async function getActiveAuthToken() {
  let authToken = null;
  if (supabaseClient) {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) authToken = session.access_token;
    } catch (e) {
      console.warn("Failed to retrieve Supabase session:", e);
    }
  }
  if (!authToken && state.currentUser) {
    authToken = state.currentUser.token || state.currentUser.id;
  }
  return authToken;
}

async function executeSaveAnalysis() {
  if (state.isSavingAnalysis) return;

  const saveBtnText = document.getElementById('report-save-btn-text');
  const saveBtn = document.getElementById('report-save-btn');

  // Fetch active Supabase session token
  const authToken = await getActiveAuthToken();

  if (!authToken) {
    state.pendingSave = true;
    openAuthModal('login');
    return;
  }

  // Prevent duplicate submissions immediately
  state.isSavingAnalysis = true;
  if (saveBtn) saveBtn.disabled = true;
  if (saveBtnText) saveBtnText.textContent = state.lang === 'ar' ? "جاري الحفظ..." : "Saving...";

  try {
    const payload = {
      title: state.analysisReport.title[state.lang] + ` (${new Date().toLocaleDateString(state.lang === 'ar' ? 'ar-SA' : 'en-US')})`,
      contractType: state.selectedType || 'employment',
      overallStatus: state.analysisReport.finalReport.overallStatus,
      safetyScore: state.analysisReport.finalReport.safetyScore,
      analysis: state.analysisReport
    };

    const response = await fetch('/api/analyses/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });

    const resData = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      state.pendingSave = true;
      openAuthModal('login');
      throw new Error(state.lang === 'ar' ? "انتهت جلسة الدخول. يرجى تسجيل الدخول مجدداً لمتابعة الحفظ." : "Session expired. Please sign in to save.");
    }

    if (!response.ok) {
      const errMsg = resData.error || (state.lang === 'ar' ? "تعذر حفظ نتيجة التحليل حالياً." : "Failed to save analysis.");
      throw new Error(errMsg);
    }

    state.isAnalysisSaved = true;
    if (resData.savedAnalysisId) {
      const activeState = getStoredChecklistState('active');
      if (Object.keys(activeState).length > 0) {
        saveStoredChecklistState(resData.savedAnalysisId, activeState);
      }
      state.currentAnalysisId = resData.savedAnalysisId;
      if (state.analysisReport) {
        state.analysisReport.id = resData.savedAnalysisId;
      }
    }
    if (saveBtnText) saveBtnText.textContent = state.lang === 'ar' ? "تم الحفظ بنجاح ✓" : "Saved Successfully ✓";
    showToastNotification(translations[state.lang].msg_save_success, 'success');

  } catch (err) {
    let userMsg = err.message;
    if (err.name === 'TypeError' || err.message.includes('fetch')) {
      userMsg = state.lang === 'ar' ? "تعذر الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت." : "Network connection error.";
    }
    showToastNotification(userMsg, 'error');
    if (saveBtnText) saveBtnText.textContent = translations[state.lang].btn_save_analysis;
    if (saveBtn) saveBtn.disabled = false;
  } finally {
    state.isSavingAnalysis = false;
  }
}

async function loadMyAnalyses() {
  const authToken = await getActiveAuthToken();
  if (!authToken) {
    openAuthModal('login');
    return;
  }

  const listEl = document.getElementById('saved-analyses-list');

  if (listEl) {
    listEl.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px;"></i><br>${state.lang === 'ar' ? 'جاري تحميل التحليلات المحفوظة...' : 'Loading saved analyses...'}</div>`;
  }

  try {
    const response = await fetch('/api/analyses', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const resData = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      closeMyAnalysesModal();
      openAuthModal('login');
      showToastNotification(state.lang === 'ar' ? "انتهت جلسة الدخول. يرجى تسجيل الدخول مجدداً." : "Session expired. Please log in.", 'error');
      return;
    }

    if (!response.ok) {
      throw new Error(resData.error || (state.lang === 'ar' ? "تعذر تحميل التحليلات المحفوظة." : "Failed to fetch saved analyses."));
    }

    const items = resData.analyses || [];
    state.savedAnalysesList = items;

    if (items.length === 0) {
      if (listEl) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 36px 20px;">
            <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--text-secondary); opacity: 0.6; margin-bottom: 12px;"></i>
            <h4 style="margin: 0 0 6px 0; font-size: 1.05rem; color: var(--text);">${state.lang === 'ar' ? 'لا توجد تحليلات محفوظة بعد' : 'No saved analyses yet'}</h4>
            <p style="margin: 0 0 20px 0; font-size: 0.85rem; color: var(--text-secondary);">${state.lang === 'ar' ? 'يمكنك حفظ نتائج تحليل عقودك هنا لمراجعتها في أي وقت.' : 'You can save contract analysis results to review them anytime.'}</p>
            <button class="btn btn-primary" id="empty-state-analyze-btn">
              <i class="fa-solid fa-plus"></i> ${state.lang === 'ar' ? 'حلل عقدًا جديدًا' : 'Analyze New Contract'}
            </button>
          </div>
        `;

        const emptyBtn = document.getElementById('empty-state-analyze-btn');
        if (emptyBtn) {
          emptyBtn.onclick = () => {
            closeMyAnalysesModal();
            restartAnalysisWizard();
            switchView('dashboard');
          };
        }
      }
      return;
    }

    if (listEl) {
      const typeLabels = {
        employment: { ar: "عقد عمل", en: "Employment Contract" },
        rental: { ar: "عقد إيجار", en: "Rental Contract" },
        mobile: { ar: "عقد اتصالات", en: "Telecom Contract" },
        subscription: { ar: "عقد اشتراك", en: "Subscription Agreement" },
        car: { ar: "مبايعة سيارة", en: "Car Sale Agreement" }
      };

      listEl.innerHTML = items.map(item => {
        const typeInfo = typeLabels[item.contract_type] || { ar: item.contract_type, en: item.contract_type };
        const displayType = typeInfo[state.lang] || typeInfo.ar;
        const formattedDate = new Date(item.created_at).toLocaleDateString(state.lang === 'ar' ? 'ar-SA' : 'en-US');

        return `
          <div class="saved-analysis-card" id="saved-card-${item.id}" style="padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--background); display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 6px 0; font-size: 1rem; color: var(--text);">${item.title}</h4>
              <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                <span><i class="fa-solid fa-file-contract"></i> ${displayType}</span>
                <span><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
                <span class="risk-pill ${item.overall_status}" style="font-size: 0.75rem; padding: 2px 8px;">${item.safety_score}% ${translations[state.lang].score_label}</span>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-open-analysis" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.85rem;">
                <i class="fa-solid fa-folder-open"></i> ${state.lang === 'ar' ? 'عرض التحليل' : 'View Analysis'}
              </button>
              <button class="btn btn-secondary btn-delete-analysis" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.85rem; color: var(--risk);">
                <i class="fa-solid fa-trash-can"></i> ${state.lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('.btn-open-analysis').forEach(btn => {
        btn.onclick = () => loadAndOpenSavedAnalysis(btn.dataset.id);
      });

      listEl.querySelectorAll('.btn-delete-analysis').forEach(btn => {
        btn.onclick = () => deleteSavedAnalysis(btn.dataset.id);
      });
    }

  } catch (err) {
    let userMsg = err.message;
    if (err.name === 'TypeError' || err.message.includes('fetch')) {
      userMsg = state.lang === 'ar' ? "تعذر الاتصال بالخادم. يرجى التحقق من الشبكة." : "Network connection error.";
    }
    if (listEl) {
      listEl.innerHTML = `<div style="color: var(--risk); padding: 20px; text-align: center;"><i class="fa-solid fa-triangle-exclamation"></i> ${userMsg}</div>`;
    }
  }
}

const openMyAnalysesModal = loadMyAnalyses;

function closeMyAnalysesModal() {
  const modal = document.getElementById('my-analyses-modal');
  if (modal) modal.style.display = 'none';
}

async function loadAndOpenSavedAnalysis(analysisId) {
  const authToken = await getActiveAuthToken();
  if (!authToken) {
    closeMyAnalysesModal();
    openAuthModal('login');
    return;
  }

  try {
    const response = await fetch(`/api/analyses/${analysisId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(resData.error || (state.lang === 'ar' ? "تعذر تحميل هذا التحليل." : "Failed to load saved analysis."));

    const item = resData.analysis;
    const json = item.analysis_json || {};

    state.selectedType = item.contract_type || 'employment';
    state.detectedType = item.contract_type || 'employment';

    const toLocalized = (val, fallback = "") => {
      if (!val) return { en: fallback, ar: fallback };
      if (typeof val === 'string') return { en: val, ar: val };
      return {
        en: val.en || val.ar || fallback,
        ar: val.ar || val.en || fallback
      };
    };

    const rawClauses = json.clauses || [];
    const normalizedClauses = rawClauses.map(c => ({
      id: c.id,
      title: toLocalized(c.title, "بند مخصص"),
      originalText: toLocalized(c.originalText, ""),
      riskLevel: c.riskLevel || "attention",
      reasoning: toLocalized(c.reasoning, ""),
      explanation: toLocalized(c.explanation, ""),
      why: toLocalized(c.why, ""),
      reasoningPath: c.reasoningPath || { en: [], ar: [] },
      reference: {
        lawName: toLocalized(c.reference?.lawName, "نظام العمل السعودي"),
        authority: toLocalized(c.reference?.authority, "الموارد البشرية والتنمية الاجتماعية"),
        article: toLocalized(c.reference?.article, "مادة نظامية"),
        section: toLocalized(c.reference?.section, "الأنظمة العامة"),
        officialSourceText: toLocalized(c.reference?.officialSourceText, ""),
        url: c.reference?.url || ""
      },
      recommendation: toLocalized(c.recommendation, "راجع الشروط والالتزامات مع طرف التعاقد الآخر."),
      confidence: (c.confidence && c.confidence.level) ? {
        level: c.confidence.level,
        reason: toLocalized(c.confidence.reason, "مطابق للأنظمة السعودية الصادرة")
      } : {
        level: "high",
        reason: { en: "Matched official Saudi legal database", ar: "مطابق للأنظمة السعودية الصادرة" }
      }
    }));

    state.currentAnalysisId = item.id;
    state.analysisReport = {
      id: item.id,
      title: toLocalized(json.title || item.title, "تحليل عقد"),
      authority: json.authority || { en: "Saudi Authorities", ar: "الجهات السعودية المعتمدة" },
      clauses: normalizedClauses,
      finalReport: json.finalReport || {
        overallStatus: item.overall_status,
        safetyScore: item.safety_score,
        stats: json.stats || { total: normalizedClauses.length, safe: 0, attention: 0, risk: 0, undocumented: 0 },
        topClauses: json.topClauses || [],
        checklist: json.checklist || { en: [], ar: [] }
      }
    };

    state.extractedText = normalizedClauses.map(c => c.originalText[state.lang] || c.originalText.ar || '').filter(Boolean).join('\n\n');

    state.isAnalysisSaved = true;
    closeMyAnalysesModal();
    renderResultsView();
    switchView('results');

    showToastNotification(state.lang === 'ar' ? `تم عرض التحليل المحفوظ بنجاح` : `Loaded saved analysis successfully`, 'success');

  } catch (err) {
    showToastNotification(err.message, 'error');
  }
}

async function deleteSavedAnalysis(analysisId) {
  const authToken = await getActiveAuthToken();
  if (!authToken) {
    openAuthModal('login');
    return;
  }

  if (!confirm(translations[state.lang].msg_delete_confirm)) return;

  try {
    const response = await fetch(`/api/analyses/${analysisId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(resData.error || (state.lang === 'ar' ? "تعذر حذف التحليل." : "Failed to delete analysis."));

    // Remove item from UI immediately
    const cardEl = document.getElementById(`saved-card-${analysisId}`);
    if (cardEl) {
      cardEl.style.opacity = '0';
      cardEl.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        cardEl.remove();
        const listEl = document.getElementById('saved-analyses-list');
        if (listEl && listEl.querySelectorAll('.saved-analysis-card').length === 0) {
          openMyAnalysesModal(); // Refresh to show empty state
        }
      }, 300);
    }

    showToastNotification(state.lang === 'ar' ? "تم حذف التحليل بنجاح." : "Analysis deleted successfully.", 'success');

  } catch (err) {
    showToastNotification(err.message, 'error');
  }
}

// --- BOOT ---
state.currentUser = getStoredUser();
init();
