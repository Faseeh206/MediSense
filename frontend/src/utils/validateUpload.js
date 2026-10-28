export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export function validateUpload(file) {
  if (!file || file.size === 0) return 'This file is empty. Choose another document.';
  if (file.size > MAX_UPLOAD_BYTES) return 'Please choose a file no larger than 10 MB.';
  if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) return 'Please use a PDF, PNG, or JPG document.';
  return '';
}
