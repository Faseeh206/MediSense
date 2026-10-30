"""NVIDIA Nemotron document analysis through OpenRouter's free endpoint."""
import base64
import logging
import re

import httpx
from pydantic import ValidationError

from app.config import settings, usable_api_key
from app.gemini_service import ANALYSIS_SYSTEM_PROMPT, GeminiService
from app.schemas import AnalysisServiceError, DocumentAnalysis

logger = logging.getLogger('medisense.openrouter')


class OpenRouterService:
    @classmethod
    async def analyze_document(cls, file_bytes, mime_type, hint_type=None):
        key = settings.OPENROUTER_API_KEY
        if not usable_api_key(key):
            raise AnalysisServiceError('Document analysis is not configured. Please contact the site administrator.', 503)
        model = settings.OPENROUTER_MODEL
        if not re.fullmatch(r'nvidia/[A-Za-z0-9._-]*nemotron[A-Za-z0-9._-]*:free', model, re.I):
            raise AnalysisServiceError('This deployment requires a free NVIDIA Nemotron model. Check the backend configuration.', 503)
        if settings.OPENROUTER_BASE_URL != 'https://openrouter.ai/api/v1':
            raise AnalysisServiceError('The analysis endpoint has a server configuration issue.', 503)
        prompt = 'Extract and explain this fictional demonstration medical document using the required JSON structure.'
        if hint_type in {'LAB_REPORT', 'PRESCRIPTION'}:
            prompt += f' The selected document type is {hint_type}; verify it against the actual document.'
        uri = f'data:{mime_type};base64,' + base64.b64encode(file_bytes).decode('ascii')
        content = [{'type': 'text', 'text': prompt}]
        if mime_type == 'application/pdf':
            content.append({'type': 'file', 'file': {'filename': 'demo-medical-document.pdf', 'file_data': uri}})
        elif mime_type in {'image/png', 'image/jpeg'}:
            content.append({'type': 'image_url', 'image_url': {'url': uri}})
        else:
            raise AnalysisServiceError('Please upload a PDF, JPG, or PNG document.', 400)
        payload = {
            'model': model,
            'messages': [{'role': 'system', 'content': ANALYSIS_SYSTEM_PROMPT}, {'role': 'user', 'content': content}],
            'temperature': 0.1,
            'max_tokens': settings.OPENROUTER_MAX_OUTPUT_TOKENS,
            'reasoning': {'enabled': False},
            'response_format': {'type': 'json_object'},
            'stream': False,
            'provider': {'allow_fallbacks': False, 'max_price': {'prompt': 0, 'completion': 0}},
        }
        if mime_type == 'application/pdf':
            # Explicitly select the free parser. OpenRouter's default PDF parser
            # can incur a separate OCR charge, even with a free model.
            payload['plugins'] = [{'id': 'file-parser', 'pdf': {'engine': 'cloudflare-ai'}}]
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(settings.OPENROUTER_TIMEOUT_SECONDS, connect=10)) as client:
                response = await client.post(
                    settings.OPENROUTER_BASE_URL + '/chat/completions',
                    headers={'Authorization': f'Bearer {key}', 'X-Title': 'MediSense', 'Content-Type': 'application/json'},
                    json=payload,
                )
            if response.status_code in {400, 401, 402, 403, 404}:
                logger.warning('OpenRouter rejected the configured request (HTTP %s)', response.status_code)
                raise AnalysisServiceError('The analysis service rejected its configuration. Check the backend key, model access, and provider settings.', 503)
            if response.status_code == 429:
                raise AnalysisServiceError('The analysis service has reached its current request limit. Please try again later.', 429)
            if response.status_code != 200:
                raise AnalysisServiceError('The analysis service is temporarily unavailable. Please try again.', 502)
            body = response.json()
            if body.get('error'):
                raise AnalysisServiceError('The analysis service could not complete this request. Please try again.', 502)
            choices = body.get('choices') or []
            if not choices or choices[0].get('finish_reason') not in {'stop', None}:
                raise AnalysisServiceError('The analysis service could not complete this document. Try a shorter or clearer report.', 502)
            message = choices[0].get('message') or {}
            text = message.get('content')
            if isinstance(text, list):
                text = ''.join(part.get('text', '') for part in text if isinstance(part, dict) and part.get('type') == 'text')
            data = GeminiService._clean_json_response(text)
            return DocumentAnalysis.model_validate(data).model_dump()
        except AnalysisServiceError:
            raise
        except httpx.TimeoutException:
            raise AnalysisServiceError('Document analysis timed out. Please try again.', 504) from None
        except httpx.RequestError:
            raise AnalysisServiceError('The analysis service could not be reached. Please try again.', 502) from None
        except (ValueError, KeyError, TypeError, AttributeError, IndexError, ValidationError):
            raise AnalysisServiceError('The analysis service returned incomplete or invalid document data. Please try a clear report.', 502) from None
