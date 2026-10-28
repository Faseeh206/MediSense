import json
import unittest
from unittest.mock import patch

import httpx

from app.config import settings
from app.gemini_service import GeminiService
from app.schemas import AnalysisServiceError

REAL_CLIENT = httpx.AsyncClient
VALID_ANALYSIS = {'is_clear_readable': True, 'document_type': 'LAB_REPORT',
                  'biomarkers': [{'test_name': 'Synthetic glucose', 'observed_value': 118, 'status': 'H'}],
                  'medicines': [], 'simple_explanation': 'Synthetic summary only.'}


def mocked_client(handler):
    transport = httpx.MockTransport(handler)
    return patch('httpx.AsyncClient', side_effect=lambda **kwargs: REAL_CLIENT(transport=transport, **kwargs))


class GeminiTests(unittest.IsolatedAsyncioTestCase):
    async def test_configured_model_and_header_key_used_without_url_secret_and_thought_parts_ignored(self):
        requests = []
        def respond(request):
            requests.append(request)
            raw = json.dumps(VALID_ANALYSIS)
            return httpx.Response(200, json={'candidates': [{'finishReason': 'STOP', 'content': {'parts': [
                {'thought': True, 'text': 'private provider reasoning, not output'},
                {'text': raw[:30]}, {'text': raw[30:]}]}}]})
        with patch.object(settings, 'GEMINI_MODEL', 'models/available-test-model'), patch.object(settings, 'GEMINI_API_KEY', 'synthetic-secret'), mocked_client(respond):
            result = await GeminiService.analyze_document(b'fictional', 'application/pdf')
        self.assertEqual(result['biomarkers'][0]['observed_value'], '118')
        self.assertEqual(result['biomarkers'][0]['status'], 'HIGH')
        self.assertEqual(len(requests), 1)
        self.assertIn('/available-test-model:generateContent', str(requests[0].url))
        self.assertNotIn('synthetic-secret', str(requests[0].url))
        self.assertEqual(requests[0].headers['x-goog-api-key'], 'synthetic-secret')
        payload = json.loads(requests[0].content)
        self.assertIn('systemInstruction', payload)
        self.assertEqual(payload['generationConfig']['responseMimeType'], 'application/json')

    async def test_provider_errors_have_correct_status_and_do_not_expose_provider_body(self):
        for upstream, expected in [(400,503), (401,503), (403,503), (404,503), (429,429), (500,502)]:
            with self.subTest(upstream=upstream), patch.object(settings, 'GEMINI_API_KEY', 'synthetic-secret'), mocked_client(lambda request: httpx.Response(upstream, json={'error': {'message': 'synthetic-secret'}})):
                with self.assertRaises(AnalysisServiceError) as raised:
                    await GeminiService.analyze_document(b'fixture', 'image/png')
                self.assertEqual(raised.exception.status_code, expected)
                self.assertNotIn('synthetic-secret', str(raised.exception))

    async def test_timeout_is_actionable(self):
        def timeout(request):
            raise httpx.ReadTimeout('synthetic timeout', request=request)
        with patch.object(settings, 'GEMINI_API_KEY', 'synthetic-secret'), mocked_client(timeout):
            with self.assertRaises(AnalysisServiceError) as raised:
                await GeminiService.analyze_document(b'fixture', 'image/png')
            self.assertEqual(raised.exception.status_code, 504)

    async def test_explicitly_unreadable_response_can_have_blank_type_and_empty_placeholders(self):
        rejected = {'is_clear_readable': False, 'document_type': '', 'unreadable_reason': 'Not a medical document', 'medicines': [{'brand_name': ''}]}
        with patch.object(settings, 'GEMINI_API_KEY', 'synthetic-secret'), mocked_client(lambda request: httpx.Response(200, json={'candidates': [{'content': {'parts': [{'text': json.dumps(rejected)}]}}]})):
            result = await GeminiService.analyze_document(b'fixture', 'application/pdf')
        self.assertFalse(result['is_clear_readable'])
        self.assertIsNone(result['document_type'])
        self.assertEqual(result['medicines'], [])

    async def test_truncated_malformed_or_schema_invalid_response_is_not_a_success(self):
        bodies = [None, {}, {'candidates': []}, {'candidates': [{'finishReason': 'MAX_TOKENS'}]},
                  {'candidates': [{'content': {'parts': [{'text': 'not-json'}]}}]},
                  {'candidates': [{'content': {'parts': [{'text': '{"is_clear_readable":true}'}]}}]}]
        for body in bodies:
            with self.subTest(body=body), patch.object(settings, 'GEMINI_API_KEY', 'synthetic-secret'), mocked_client(lambda request: httpx.Response(200, json=body)):
                with self.assertRaises(AnalysisServiceError) as raised:
                    await GeminiService.analyze_document(b'fixture', 'image/png')
                self.assertEqual(raised.exception.status_code, 502)


if __name__ == '__main__':
    unittest.main()
