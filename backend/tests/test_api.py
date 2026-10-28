import base64
import importlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, mock_open, patch

from fastapi.testclient import TestClient
from pypdf import PdfWriter

from app.config import settings

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=')
ANALYSIS = {
    'is_clear_readable': True, 'unreadable_reason': None, 'document_type': 'LAB_REPORT',
    'document_title': 'Synthetic integration test', 'laboratory_or_clinic': 'Test fixture only',
    'biomarkers': [{'test_name': 'Glucose', 'observed_value': '118', 'unit': 'mg/dL', 'reference_range': '70 - 99', 'status': 'HIGH', 'clinical_meaning': 'Synthetic test explanation.'}],
    'medicines': [], 'simple_explanation': 'This synthetic report is for an integration test, not patient care.',
    'recommended_specialist': 'General Physician',
}


class ApiIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_root = Path(__file__).resolve().parent / '.state'
        cls.test_root.mkdir(exist_ok=True)
        cls.temp = tempfile.TemporaryDirectory(prefix='api-', dir=cls.test_root)
        cls.saved_settings = {name: getattr(settings, name) for name in ['DATABASE_URL', 'SQLITE_PATH', 'GEMINI_API_KEY', 'ALLOW_SQLITE_FALLBACK']}
        settings.DATABASE_URL = 'sqlite:///' + str(Path(cls.temp.name) / 'isolated.db')
        settings.SQLITE_PATH = str(Path(cls.temp.name) / 'isolated.db')
        settings.GEMINI_API_KEY = 'test-only-not-a-real-key'
        settings.ALLOW_SQLITE_FALLBACK = True
        cls.main = importlib.import_module('app.main')
        cls.database = importlib.import_module('app.database')
        cls.client_context = TestClient(cls.main.app, raise_server_exceptions=False, headers={'X-Client-Token': 'a' * 64})
        cls.client = cls.client_context.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_context.__exit__(None, None, None)
        if cls.database.engine is not None:
            cls.database.engine.dispose()
        for key, value in cls.saved_settings.items():
            setattr(settings, key, value)
        if not Path(cls.temp.name).resolve().is_relative_to(cls.test_root.resolve()):
            raise RuntimeError('Refusing to clean a test database outside the test workspace')
        cls.temp.cleanup()

    def setUp(self):
        self.main.analysis_limiter.events.clear()
        with self.database.SessionLocal() as db:
            db.query(self.database.MedicalRecord).delete()
            db.commit()

    def analyze(self, name='test.png', contents=PNG, mime='image/png', result=None, **kwargs):
        with patch.object(self.main.GeminiService, 'analyze_document', new_callable=AsyncMock, return_value=result if result is not None else ANALYSIS) as ai:
            response = self.client.post('/api/analyze', files={'file': (name, contents, mime)}, **kwargs)
        return response, ai

    def test_health_and_history_round_trip(self):
        health = self.client.get('/api/health')
        self.assertEqual(health.status_code, 200)
        self.assertTrue(health.json()['database']['connected'])
        self.assertIn('analysis_configured', health.json())
        self.assertNotIn('gemini', health.text.lower())
        response, _ = self.analyze()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json().get('saved_to_history'))
        record_id = response.json()['id']
        history = self.client.get('/api/history').json()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]['id'], record_id)
        detail = self.client.get(f'/api/history/{record_id}')
        self.assertEqual(detail.json()['extracted_data']['biomarkers'][0]['observed_value'], '118')
        self.assertEqual(self.client.delete(f'/api/history/{record_id}').status_code, 200)
        self.assertEqual(self.client.get(f'/api/history/{record_id}').status_code, 404)
        self.assertEqual(self.client.get('/api/history').json(), [])

    def test_public_history_is_scoped_to_browser_and_foreign_ids_cannot_be_read_or_deleted(self):
        response, _ = self.analyze()
        record_id = response.json()['id']
        foreign = {'X-Client-Token': 'b' * 64}
        self.assertEqual(self.client.get('/api/history', headers=foreign).json(), [])
        self.assertEqual(self.client.get(f'/api/history/{record_id}', headers=foreign).status_code, 404)
        self.assertEqual(self.client.delete(f'/api/history/{record_id}', headers=foreign).status_code, 404)
        self.assertEqual(len(self.client.get('/api/history').json()), 1)
        self.assertEqual(self.client.get('/api/history', headers={'X-Client-Token': ''}).status_code, 401)

    def test_unassigned_legacy_rows_remain_preserved_but_hidden_from_public_clients(self):
        with self.database.SessionLocal() as db:
            db.add(self.database.MedicalRecord(file_name='synthetic-legacy.pdf', record_type='LAB_REPORT', simple_explanation='Synthetic legacy fixture'))
            db.commit()
            self.assertEqual(db.query(self.database.MedicalRecord).count(), 1)
        self.assertEqual(self.client.get('/api/history').json(), [])

    def test_deletion_erases_report_content_and_retains_only_sync_tombstone(self):
        response, _ = self.analyze()
        record_id = response.json()['id']
        self.assertEqual(self.client.delete(f'/api/history/{record_id}').status_code, 200)
        with self.database.SessionLocal() as db:
            record = db.query(self.database.MedicalRecord).filter_by(id=record_id).one()
            self.assertIsNotNone(record.deleted_at)
            self.assertTrue(record.sync_id)
            self.assertEqual(record.file_name, '')
            self.assertEqual(record.simple_explanation, '')
            self.assertIsNone(record.extracted_data)
            self.assertIsNone(record.api_enriched_data)

    def test_analysis_limit_cannot_be_bypassed_by_changing_the_browser_token(self):
        with patch.object(settings, 'ANALYSES_PER_HOUR', 1):
            response, _ = self.analyze()
            self.assertEqual(response.status_code, 200)
            response, ai = self.analyze(headers={'X-Client-Token': 'b' * 64})
            self.assertEqual(response.status_code, 429)
            self.assertIn('Retry-After', response.headers)
            ai.assert_not_awaited()

    def test_upload_rejects_empty_or_disguised_files_before_ai(self):
        for name, data, mime in [('empty.png', b'', 'image/png'), ('fake.pdf', b'not a PDF', 'application/pdf'), ('fake.jpg', b'not a JPEG', 'image/jpeg')]:
            response, ai = self.analyze(name, data, mime)
            self.assertEqual(response.status_code, 400, name)
            ai.assert_not_awaited()
        self.assertEqual(self.client.get('/api/history').json(), [])

    def test_upload_mime_comes_from_validated_file_not_client_header(self):
        response, ai = self.analyze('test.png', PNG, 'application/octet-stream')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ai.call_args.kwargs['mime_type'], 'image/png')

    def test_size_limit_and_unsupported_extension(self):
        with patch.object(settings, 'MAX_FILE_SIZE_BYTES', 8):
            response, ai = self.analyze()
        self.assertEqual(response.status_code, 413)
        ai.assert_not_awaited()
        response, ai = self.analyze('test.exe', PNG, 'image/png')
        self.assertEqual(response.status_code, 400)
        ai.assert_not_awaited()

    def test_pdf_validation_and_document_hint(self):
        writer = PdfWriter(); writer.add_blank_page(width=100, height=100)
        stream = io.BytesIO(); writer.write(stream)
        response, ai = self.analyze('report.pdf', stream.getvalue(), 'application/octet-stream', data={'document_type': 'lab_report'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ai.call_args.kwargs['mime_type'], 'application/pdf')
        self.assertEqual(ai.call_args.kwargs['hint_type'], 'LAB_REPORT')

    def test_missing_key_is_actionable_without_consuming_ai(self):
        with patch.object(settings, 'GEMINI_API_KEY', ''):
            response, ai = self.analyze()
        self.assertEqual(response.status_code, 503)
        ai.assert_not_awaited()
        self.assertNotIn('test-only-not-a-real-key', response.text)

    def test_unreadable_and_malformed_ai_results_are_not_saved(self):
        response, _ = self.analyze(result={**ANALYSIS, 'is_clear_readable': False, 'unreadable_reason': 'Synthetic blur'})
        self.assertEqual(response.status_code, 422)
        for result in [[], {'unexpected': 'shape'}, {**ANALYSIS, 'biomarkers': [None]}]:
            response, _ = self.analyze(result=result)
            self.assertEqual(response.status_code, 502)
        self.assertEqual(self.client.get('/api/history').json(), [])

    def test_samples_are_labelled_and_do_not_create_patient_history(self):
        response = self.client.post('/api/sample/sample_lipid_glucose')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json().get('is_sample'))
        self.assertEqual(self.client.get('/api/history').json(), [])
        self.assertEqual(self.client.post('/api/sample/missing').status_code, 404)

    def test_gemini_medicine_information_is_saved_without_any_fda_lookup(self):
        directions = 'Original synthetic directions, unchanged.'
        prescription = {**ANALYSIS, 'document_type': 'PRESCRIPTION', 'biomarkers': [], 'medicines': [{'brand_name': 'Synthetic Testmed', 'dosage': 'fixture', 'frequency_instructions': directions,
            'patient_information': {'identification': 'recognized', 'uses': 'Fictional test use.', 'important_warnings': 'Fictional test warning.'}}]}
        with patch('httpx.AsyncClient', side_effect=AssertionError('No second external lookup permitted')) as lookup:
            result, _ = self.analyze(result=prescription)
        self.assertEqual(result.status_code, 200)
        lookup.assert_not_called()
        saved = self.client.get('/api/history/' + str(result.json()['id'])).json()
        self.assertEqual(saved['api_enriched_data']['provider'], 'ai')
        self.assertEqual(saved['api_enriched_data']['verification_status'], 'not_independently_verified')
        self.assertEqual(saved['api_enriched_data']['patient_information']['uses'], 'Fictional test use.')
        self.assertEqual(saved['extracted_data']['medicines'][0]['frequency_instructions'], directions)

    def test_persistence_failure_does_not_pretend_history_was_saved(self):
        with patch.object(self.main, 'save_record_synced', side_effect=RuntimeError('synthetic storage failure')):
            response, _ = self.analyze()
        self.assertEqual(response.status_code, 200)
        self.assertIs(response.json().get('saved_to_history'), False)
        self.assertIsNone(response.json().get('id'))
        self.assertTrue(response.json().get('persistence_warning'))

    def test_runtime_configuration_requires_admin_credentials_and_never_writes_env(self):
        with patch('app.main.open', mock_open(), create=True) as file_open, patch.object(settings, 'GEMINI_API_KEY', 'test-only-not-a-real-key'):
            response = self.client.post('/api/config/gemini-key', json={'key': 'synthetic-replacement-key'})
        self.assertEqual(response.status_code, 403)
        file_open.assert_not_called()
        self.assertEqual(self.client.post('/api/db/sync').status_code, 403)

    def test_unknown_api_routes_are_json_404(self):
        response = self.client.get('/api/not-a-real-route')
        self.assertEqual(response.status_code, 404)
        self.assertIn('application/json', response.headers.get('content-type', ''))

    def test_static_handler_cannot_serve_files_outside_dist(self):
        dist = Path(self.temp.name) / 'dist'; dist.mkdir(exist_ok=True)
        (dist / 'index.html').write_text('<h1>public fixture</h1>', encoding='utf8')
        (dist.parent / 'canary.env').write_text('SYNTHETIC_PRIVATE_CANARY', encoding='utf8')
        with patch.object(self.main, 'frontend_dist', str(dist)):
            response = self.client.get('/..%2fcanary.env')
        self.assertEqual(response.status_code, 404)
        self.assertNotIn('SYNTHETIC_PRIVATE_CANARY', response.text)


if __name__ == '__main__':
    unittest.main()
