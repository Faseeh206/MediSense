import copy
import io
import json
import logging
import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from pypdf import PdfReader
from sqlalchemy import desc, text
from sqlalchemy.orm import Session

from app.config import settings, usable_api_key
from app import database
from app.database import MedicalRecord, delete_record_synced, get_active_db_type, get_db, init_db, save_record_synced, sync_sqlite_to_postgres
from app.access import analysis_limiter, client_owner, optional_owner, require_admin
from app.gemini_service import GeminiService
from app.medicine_information import medicine_information_context
from app.schemas import AnalysisServiceError, DocumentAnalysis
from app.specialist_guide import determine_specialist
from app.sample_data import SAMPLE_RECORDS

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logging.getLogger('httpx').setLevel(logging.WARNING)
logger = logging.getLogger('medisense.main')
MANDATORY_DISCLAIMER = 'MediSense is an informational aid, not medical advice. Always review your results with a qualified clinician.'


@asynccontextmanager
async def lifespan(_app):
    await run_in_threadpool(init_db)
    yield
    if database.engine is not None:
        database.engine.dispose()


app = FastAPI(title='MediSense API', version=settings.VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r'https?://(?:localhost|127\.0\.0\.1)(?::\d+)?' if settings.ALLOW_LOCAL_ORIGINS else None,
    allow_credentials=False, allow_methods=['GET','POST','DELETE','OPTIONS'],
    allow_headers=['Content-Type','X-Client-Token','X-Gemini-Key','X-Admin-Token'], expose_headers=['X-Medical-Disclaimer'])


@app.middleware('http')
async def add_disclaimer_header(request, call_next):
    response = await call_next(request)
    response.headers['X-Medical-Disclaimer'] = MANDATORY_DISCLAIMER
    return response


@app.get('/api/health')
def health_check(request: Request, db: Session = Depends(get_db)):
    connected = False; own_count = None
    try:
        db.execute(text('SELECT 1')); connected = True
        owner = optional_owner(request)
        if owner:
            own_count = db.query(MedicalRecord).filter_by(owner_hash=owner, deleted_at=None).count()
    except Exception as error:
        db.rollback(); logger.error('Database health check failed (%s)', type(error).__name__)
    return {'status': 'online' if connected else 'degraded', 'service': settings.PROJECT_NAME, 'version': settings.VERSION,
            'database': {'connected': connected, 'engine': get_active_db_type(), 'total_records': own_count, 'record_scope': 'this_browser'},
            'analysis_configured': usable_api_key(settings.GEMINI_API_KEY),
            'medication_information_provider': 'AI-powered analysis', 'disclaimer': MANDATORY_DISCLAIMER}


@app.post('/api/config/gemini-key', dependencies=[Depends(require_admin)])
def configure_gemini_key(payload: dict):
    value = payload.get('key')
    if not isinstance(value, str) or '\n' in value or '\r' in value or not usable_api_key(value) or len(value.strip()) < 10:
        raise HTTPException(400, 'A valid single-line API key is required.')
    settings.GEMINI_API_KEY = value.strip()
    return {'success': True, 'message': 'Updated for this backend process. Use the server environment for persistent configuration.'}


@app.get('/api/history')
def get_history(owner: str = Depends(client_owner), db: Session = Depends(get_db)):
    records = db.query(MedicalRecord).filter_by(owner_hash=owner, deleted_at=None).order_by(desc(MedicalRecord.created_at), desc(MedicalRecord.id)).limit(15).all()
    return [record.to_dict() for record in records]


@app.get('/api/history/{record_id}')
def get_history_detail(record_id: int, owner: str = Depends(client_owner), db: Session = Depends(get_db)):
    record = db.query(MedicalRecord).filter_by(id=record_id, owner_hash=owner, deleted_at=None).first()
    if record is None:
        raise HTTPException(404, 'Scan record not found.')
    return record.to_dict()


@app.delete('/api/history/{record_id}')
def delete_history_record(record_id: int, owner: str = Depends(client_owner), db: Session = Depends(get_db)):
    if not delete_record_synced(db, record_id, owner):
        raise HTTPException(404, 'Scan record not found.')
    return {'success': True, 'deleted_id': record_id, 'message': 'The explanation and its content were removed from history.'}


@app.post('/api/db/sync', dependencies=[Depends(require_admin)])
def trigger_database_sync():
    return sync_sqlite_to_postgres()


@app.post('/api/sample/{sample_key}')
async def load_sample_analysis(sample_key: str):
    sample = SAMPLE_RECORDS.get(sample_key)
    if sample is None:
        raise HTTPException(404, 'Sample document not found.')
    result = copy.deepcopy(sample)
    extracted = result['extracted_data']
    specialist = determine_specialist(extracted.get('biomarkers', []), extracted.get('medicines', []), extracted.get('ai_suggested_specialist'))
    extracted['specialist_recommendation'] = specialist
    return {**result, 'id': None, 'created_at': None, 'is_sample': True, 'sample_key': sample_key, 'saved_to_history': False,
            'specialist_recommendation': specialist, 'disclaimer': 'Illustrative sample only. This is not your medical report, a live openFDA lookup, or medical advice. Always review your own results with a qualified clinician.'}


def validate_document(contents, extension):
    if not contents:
        raise HTTPException(400, 'The document is empty. Please choose a readable file.')
    if extension == '.pdf':
        if not contents.startswith(b'%PDF-'):
            raise HTTPException(400, 'This file is not a valid PDF. Please upload a PDF, JPG, or PNG document.')
        try:
            reader = PdfReader(io.BytesIO(contents))
            if reader.is_encrypted and not reader.decrypt(''):
                raise HTTPException(400, 'This PDF is password protected. Please upload an unlocked copy.')
            page_count = len(reader.pages)
            if page_count < 1 or page_count > settings.MAX_PDF_PAGES:
                raise HTTPException(400, f'Please use a PDF containing 1 to {settings.MAX_PDF_PAGES} pages.')
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(400, 'This PDF could not be read. Please export a new copy and try again.') from None
        return 'application/pdf'
    if extension == '.png' and contents.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png'
    if extension in {'.jpg','.jpeg'} and contents.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg'
    raise HTTPException(400, 'The file contents do not match its image format. Please export a clear JPG or PNG.')


@app.post('/api/analyze')
async def analyze_document(request: Request, file: UploadFile = File(...), document_type: Optional[str] = Form(None),
    x_gemini_key: Optional[str] = Header(None, alias='X-Gemini-Key'), owner: str = Depends(client_owner), db: Session = Depends(get_db)):
    filename = re.sub(r'[\x00-\x1f\x7f]', '', (file.filename or '').replace('\\','/').rsplit('/',1)[-1]).strip()
    extension = Path(filename).suffix.lower()
    if extension not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(400, 'Unsupported file format. Please choose a PDF, JPG, JPEG, or PNG.')
    try:
        contents = await file.read(settings.MAX_FILE_SIZE_BYTES + 1)
    finally:
        await file.close()
    if len(contents) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, 'The document exceeds the 10 MB limit.')
    mime_type = await run_in_threadpool(validate_document, contents, extension)
    hint = None
    if document_type:
        raw = document_type.strip().upper()
        if raw in {'PRESCRIPTION','MEDICINE','MEDICINE_CHECK'}:
            hint = 'PRESCRIPTION'
        elif raw in {'LAB_REPORT','LAB','REPORT'}:
            hint = 'LAB_REPORT'
        elif raw not in {'AUTO','AUTO_DETECT'}:
            raise HTTPException(400, 'Please select Lab report, Prescription, or automatic detection.')
    active_key = x_gemini_key or settings.GEMINI_API_KEY
    if not usable_api_key(active_key):
        raise HTTPException(503, 'Document analysis is not configured. Please contact the site administrator.')
    analysis_limiter.admit(request.client.host if request.client else None)
    try:
        raw_result = await GeminiService.analyze_document(file_bytes=contents, mime_type=mime_type, hint_type=hint, custom_key=active_key)
        analysis = DocumentAnalysis.model_validate(raw_result).model_dump()
    except AnalysisServiceError as error:
        raise HTTPException(error.status_code, str(error)) from None
    except (ValidationError, TypeError, ValueError):
        raise HTTPException(502, 'The analysis service returned incomplete or invalid document data. Please try a clear medical document.') from None
    except Exception as error:
        logger.error('Document analysis failed (%s)', type(error).__name__)
        raise HTTPException(502, 'The analysis service could not complete this request. Please try again.') from None
    if not analysis['is_clear_readable']:
        raise HTTPException(422, 'Please upload a clear, well-lit medical report or prescription. ' + (analysis.get('unreadable_reason') or 'The document could not be read safely.')[:240])
    biomarkers, medicines = analysis['biomarkers'], analysis['medicines']
    enriched = medicine_information_context(medicines)
    specialist = determine_specialist(biomarkers, medicines, analysis.get('recommended_specialist'))
    extracted = {'document_title': analysis['document_title'], 'laboratory_or_clinic': analysis['laboratory_or_clinic'], 'biomarkers': biomarkers, 'medicines': medicines, 'specialist_recommendation': specialist}
    if await request.is_disconnected():
        raise HTTPException(499, 'The document request was cancelled.')
    safe_name = filename if len(filename) <= 255 else Path(filename).stem[:240] + extension
    try:
        def persist():
            record = save_record_synced(db=db, file_name=safe_name, record_type=analysis['document_type'], extracted_data=json.dumps(extracted), api_enriched_data=json.dumps(enriched), simple_explanation=analysis['simple_explanation'], owner_hash=owner)
            return record.to_dict()
        result = await run_in_threadpool(persist)
    except Exception as error:
        db.rollback(); logger.error('Analysis is ready but history persistence failed (%s)', type(error).__name__)
        result = {'id': None, 'created_at': None, 'file_name': safe_name, 'record_type': analysis['document_type'], 'extracted_data': extracted, 'api_enriched_data': enriched, 'simple_explanation': analysis['simple_explanation'], 'saved_to_history': False,
                  'persistence_warning': 'Your explanation is ready, but it could not be saved to history. You can still print or share it.'}
    return {**result, 'specialist_recommendation': specialist, 'disclaimer': MANDATORY_DISCLAIMER}


frontend_dist = str(Path(__file__).resolve().parents[2] / 'frontend' / 'dist')
assets = Path(frontend_dist) / 'assets'
if assets.is_dir():
    app.mount('/assets', StaticFiles(directory=assets), name='static_assets')


@app.get('/{full_path:path}', include_in_schema=False)
async def serve_frontend(full_path: str):
    if full_path == 'api' or full_path.startswith('api/'):
        raise HTTPException(404, 'API route not found.')
    root = Path(frontend_dist).resolve()
    target = (root / full_path).resolve()
    if not target.is_relative_to(root) or any(part.startswith('.') for part in Path(full_path).parts):
        raise HTTPException(404, 'File not found.')
    if target.is_file():
        return FileResponse(target)
    if Path(full_path).suffix or not (root / 'index.html').is_file():
        raise HTTPException(404, 'File not found.')
    return FileResponse(root / 'index.html', headers={'Cache-Control': 'no-cache'})
