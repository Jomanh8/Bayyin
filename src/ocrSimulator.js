// ocrSimulator.js - Frontend file type validator

export const validateFileType = (fileName) => {
  const allowedExtensions = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'heic'];
  const ext = fileName.split('.').pop().toLowerCase();
  return allowedExtensions.includes(ext);
};
