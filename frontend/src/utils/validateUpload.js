export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export function resolveUploadLimit(value) {
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, MAX_UPLOAD_BYTES) : MAX_UPLOAD_BYTES;
}
export function uploadLimitLabel(value) {
  return `${Number((resolveUploadLimit(value) / (1024 * 1024)).toFixed(2))} MB`;
}
export function validateUpload(file, maximumBytes = MAX_UPLOAD_BYTES) {
  if (!file || file.size === 0) return 'This file is empty. Choose another document.';
  if (file.size > resolveUploadLimit(maximumBytes)) return `Please choose a file no larger than ${uploadLimitLabel(maximumBytes)}.`;
  if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) return 'Please use a PDF, PNG, or JPG document.';
  return '';
}
