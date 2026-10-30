import { requestDocumentAnalysis } from './uploadDocument.js';
import { getClientHeaders } from './clientIdentity.js';
import { apiErrorMessage } from './apiErrors.js';

// Same-origin API requests work on localhost, phones, and a hosted frontend.
// Vite proxies /api during development; production can serve the API alongside
// the site or use an explicit VITE_API_BASE (the backend origin, without /api).
const API_BASE = (import.meta.env?.VITE_API_BASE || '').trim().replace(/\/+$/, '');

async function requestApi(path, options = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers: getClientHeaders(options.headers) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(apiErrorMessage(data, res.status));
  if (!data || typeof data !== 'object') throw new Error('The service returned an unreadable response. Please try again.');
  return data;
}
export const fetchHealth = () => requestApi('/health');
export async function uploadAndAnalyze({ file, documentType, signal, onUploadProgress, onUploaded, demoDocumentConfirmed = false }) {
  const formData = new FormData();
  formData.append('file', file);
  if (documentType) formData.append('document_type', documentType);
  formData.append('demo_document_confirmed', String(demoDocumentConfirmed));
  if (onUploadProgress || onUploaded) return requestDocumentAnalysis({
    url: `${API_BASE}/api/analyze`, formData, signal, onUploadProgress, onUploaded, headers: getClientHeaders(),
  });
  return requestApi('/analyze', { method: 'POST', body: formData, signal });
}
export const loadSampleAnalysis = key => requestApi(`/sample/${encodeURIComponent(key)}`, { method: 'POST' });
export async function fetchHistory() {
  const records = await requestApi('/history');
  if (!Array.isArray(records)) throw new Error('The saved history could not be read. Please try again.');
  return records;
}
export const fetchHistoryRecord = id => requestApi(`/history/${encodeURIComponent(id)}`);
export const deleteHistoryRecord = id => requestApi(`/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
