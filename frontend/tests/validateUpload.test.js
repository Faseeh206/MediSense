import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUpload, MAX_UPLOAD_BYTES } from '../src/utils/validateUpload.js';

test('accepts supported extensions without depending on browser MIME detection', () => {
  for (const name of ['report.pdf', 'report.PNG', 'report.jpg', 'report.jpeg']) {
    assert.equal(validateUpload({name, size: 1024}), '');
  }
});
test('rejects empty, oversized, and unsupported files', () => {
  assert.match(validateUpload({name:'report.pdf', size:0}), /empty/);
  assert.match(validateUpload({name:'report.pdf', size:MAX_UPLOAD_BYTES + 1}), /10 MB/);
  assert.match(validateUpload({name:'report.pdf.exe', size:1024}), /PDF, PNG, or JPG/);
  assert.equal(validateUpload({name:'report.pdf', size:MAX_UPLOAD_BYTES}), '');
});
