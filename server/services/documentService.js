import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import Jimp from 'jimp';
import { detectTextLanguage } from './classifierService.js';

/**
 * Validates text extraction density and rejects unreadable gibberish or extremely low confidence.
 */
export const validateExtractedText = (text, confidence) => {
  if (!text || text.trim().length < 25) {
    throw new Error("This document could not be read accurately.");
  }
  
  const totalChars = text.length;
  const readableChars = (text.match(/[\u0600-\u06FFa-zA-Z0-9\s]/g) || []).length;
  const readabilityRatio = readableChars / totalChars;

  if (readabilityRatio < 0.60) {
    throw new Error("This document could not be read accurately.");
  }

  if (confidence !== undefined && confidence < 35) {
    throw new Error("This document could not be read accurately.");
  }

  return true;
};

/**
 * Preprocesses image buffers client-free using Jimp (binarization, resolution upscaling, and grayscale)
 */
async function preprocessImageBuffer(buffer) {
  const image = await Jimp.read(buffer);

  // Grayscale & stark threshold binarization (cleans scan noise and enhances readability)
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const val = gray < 135 ? 0 : 255;
    
    this.bitmap.data[idx] = val;
    this.bitmap.data[idx + 1] = val;
    this.bitmap.data[idx + 2] = val;
  });

  // Resolution normalization: double scale if image is narrow (< 1200px)
  if (image.bitmap.width < 1200) {
    image.resize(image.bitmap.width * 2, Jimp.AUTO, Jimp.RESIZE_BEZIER);
  }

  return await image.getBufferAsync(Jimp.MIME_PNG);
}

/**
 * Scans a PDF buffer and extracts raw embedded JPEGs to execute OCR if direct text is missing.
 */
function extractJpegsFromPDF(pdfBuffer) {
  const images = [];
  let pos = 0;
  
  while (true) {
    const start = pdfBuffer.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]), pos);
    if (start === -1) break;
    const end = pdfBuffer.indexOf(Buffer.from([0xFF, 0xD9]), start);
    if (end === -1) break;
    
    images.push(pdfBuffer.slice(start, end + 2));
    pos = end + 2;
    // Limit to first 3 pages for prompt OCR response and resource management
    if (images.length >= 3) break;
  }
  
  return images;
}

/**
 * Core multi-stage text extraction runner
 */
export const extractTextFromBuffer = async (fileBuffer, fileName, onProgress) => {
  const ext = fileName.split('.').pop().toLowerCase();

  if (ext === 'pdf') {
    onProgress(10, "Reading PDF text streams...", "جاري قراءة نصوص ملف PDF...");
    
    let pdfData;
    try {
      pdfData = await pdfParse(fileBuffer);
    } catch (err) {
      pdfData = { text: "", numpages: 1 };
    }

    const text = pdfData.text || "";
    let isDirectValid = false;
    try {
      isDirectValid = validateExtractedText(text);
    } catch (err) {
      isDirectValid = false;
    }

    // Step 1: Direct text extraction succeeded
    if (isDirectValid) {
      return {
        text: text.trim(),
        method: "Direct PDF",
        confidence: 100,
        pages: pdfData.numpages || 1,
        language: detectTextLanguage(text)
      };
    }

    // Step 2: Fallback to scanned PDF OCR
    onProgress(35, "Scanned PDF page detected. Launching OCR engine...", "تم كشف صفحات مصورة بالملف. تهيئة محرك OCR...");
    const jpegBuffers = extractJpegsFromPDF(fileBuffer);

    if (jpegBuffers.length === 0) {
      throw new Error("This document could not be read accurately.");
    }

    // Perform OCR on page 1 image
    let imgBuffer = jpegBuffers[0];
    onProgress(45, "Running first-pass OCR analysis...", "جاري تشغيل مسح OCR الأولي...");
    
    // First pass OCR (bilingual)
    const firstPassText = await Tesseract.recognize(imgBuffer, 'ara+eng');
    const firstPassTextStr = firstPassText.data.text;
    const confidence = firstPassText.data.confidence;
    const detectedLang = detectTextLanguage(firstPassTextStr);
    const langCode = detectedLang === "Arabic" ? "ara" : detectedLang === "English" ? "eng" : "ara+eng";

    // Step 3: OCR Confidence check
    if (confidence < 65) {
      onProgress(70, "Low OCR confidence. Enhancing image contrast & binarizing...", "جودة المسح منخفضة. جاري تحسين التباين وتصفية التشويش...");
      imgBuffer = await preprocessImageBuffer(imgBuffer);

      onProgress(80, "Executing final optimized OCR pass...", "إعادة مسح الحروف بالمحرك المحسّن...");
      const secondPassText = await Tesseract.recognize(imgBuffer, langCode);
      
      validateExtractedText(secondPassText.data.text, secondPassText.data.confidence);

      return {
        text: secondPassText.data.text.trim(),
        method: "Image Processing + OCR",
        confidence: secondPassText.data.confidence,
        pages: pdfData.numpages || 1,
        language: detectedLang
      };
    }

    validateExtractedText(firstPassTextStr, confidence);
    return {
      text: firstPassTextStr.trim(),
      method: "OCR",
      confidence: confidence,
      pages: pdfData.numpages || 1,
      language: detectedLang
    };

  } else if (ext === 'docx') {
    onProgress(20, "Extracting text from DOCX document...", "جاري قراءة نصوص مستند Word...");
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const text = result.value || "";
    
    validateExtractedText(text);

    return {
      text: text.trim(),
      method: "DOCX",
      confidence: 100,
      pages: 1,
      language: detectTextLanguage(text)
    };

  } else if (['jpg', 'jpeg', 'png', 'heic'].includes(ext)) {
    onProgress(20, "Extracting text from contract image...", "جاري تهيئة محرك OCR لمسح الصورة...");

    let imgBuffer = fileBuffer;
    onProgress(45, "Running first-pass OCR analysis...", "جاري تشغيل مسح OCR الأولي...");
    
    // First pass OCR (bilingual)
    const firstPassText = await Tesseract.recognize(imgBuffer, 'ara+eng');
    const firstPassTextStr = firstPassText.data.text;
    const confidence = firstPassText.data.confidence;
    const detectedLang = detectTextLanguage(firstPassTextStr);
    const langCode = detectedLang === "Arabic" ? "ara" : detectedLang === "English" ? "eng" : "ara+eng";

    // Step 3: OCR Confidence check
    if (confidence < 65) {
      onProgress(70, "Low OCR confidence. Enhancing image contrast & binarizing...", "جودة المسح منخفضة. جاري تحسين التباين وتصفية التشويش...");
      imgBuffer = await preprocessImageBuffer(imgBuffer);

      onProgress(80, "Executing final optimized OCR pass...", "إعادة مسح الحروف بالمحرك المحسّن...");
      const secondPassText = await Tesseract.recognize(imgBuffer, langCode);
      
      validateExtractedText(secondPassText.data.text, secondPassText.data.confidence);

      return {
        text: secondPassText.data.text.trim(),
        method: "Image Processing + OCR",
        confidence: secondPassText.data.confidence,
        pages: 1,
        language: detectedLang
      };
    }

    validateExtractedText(firstPassTextStr, confidence);
    return {
      text: firstPassTextStr.trim(),
      method: "OCR",
      confidence: confidence,
      pages: 1,
      language: detectedLang
    };

  } else {
    throw new Error("Unsupported file type");
  }
};
