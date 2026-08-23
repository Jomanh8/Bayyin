/**
 * Detects whether the text is primarily Arabic, English, or Mixed
 */
export const detectTextLanguage = (text) => {
  if (!text) return "Mixed";
  const arCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const enCount = (text.match(/[a-zA-Z]/g) || []).length;
  
  const total = arCount + enCount;
  if (total === 0) return "Mixed";
  
  if (arCount / total > 0.85) return "Arabic";
  if (enCount / total > 0.85) return "English";
  return "Mixed";
};

/**
 * Classifies the contract type based on keyword matches
 */
export const detectContractTypeFromText = (text) => {
  if (!text) return "employment";
  const types = ["employment", "rental", "mobile", "subscription", "car"];
  let bestType = "employment";
  let maxScore = -1;

  const typeKeywords = {
    employment: ["work", "employee", "employer", "salary", "wage", "probation", "وظيفة", "عامل", "صاحب العمل", "راتب", "أجر", "تجربة"],
    rental: ["rent", "landlord", "tenant", "apartment", "lease", "eviction", "إيجار", "مؤجر", "مستأجر", "شقة", "عين مؤجرة", "إخلاء"],
    mobile: ["telecom", "internet", "data package", "cancellation fee", "اتصالات", "إنترنت", "باقة", "شريحة", "جهاز مدعوم"],
    subscription: ["subscription", "auto-renew", "auto-renewal", "biometric", "اشتراك", "تجديد تلقائي", "بيانات شخصية", "حيوية"],
    car: ["vehicle", "car", "deposit", "defects", "warranty", "سيارة", "مركبة", "عربون", "معاينة", "عيب خفي", "بائع", "مشتري"]
  };

  for (const type of types) {
    let score = 0;
    const keywords = typeKeywords[type];
    keywords.forEach(kw => {
      const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escaped, "gi");
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    });
    if (score > maxScore && score > 0) {
      maxScore = score;
      bestType = type;
    }
  }
  return bestType;
};
