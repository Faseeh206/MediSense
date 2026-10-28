import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR.parent / '.env')


def env_bool(name, default=False):
    value = os.getenv(name)
    return default if value is None else value.strip().lower() in {'1', 'true', 'yes', 'on'}


def usable_api_key(value):
    key = (value or '').strip()
    return bool(key) and not key.lower().startswith(('your_', 'your-', 'replace_', 'placeholder'))


class Settings:
    PROJECT_NAME = 'MediSense'
    VERSION = '2.4.0'
    API_PREFIX = '/api'
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash').strip().removeprefix('models/')
    GEMINI_TIMEOUT_SECONDS = float(os.getenv('GEMINI_TIMEOUT_SECONDS', '60'))
    GEMINI_MAX_OUTPUT_TOKENS = int(os.getenv('GEMINI_MAX_OUTPUT_TOKENS', '8192'))
    ADMIN_API_TOKEN = os.getenv('ADMIN_API_TOKEN', '').strip()
    DATABASE_BACKEND = os.getenv('DATABASE_BACKEND', 'auto').strip().lower()
    DATABASE_URL = os.getenv('DATABASE_URL', '').strip()
    POSTGRES_HOST = os.getenv('POSTGRES_HOST', '127.0.0.1')
    POSTGRES_PORT = int(os.getenv('POSTGRES_PORT', '5432') or '5432')
    POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
    POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', '')
    POSTGRES_DATABASE = os.getenv('POSTGRES_DATABASE', 'medisense_db')
    ALLOW_SQLITE_FALLBACK = env_bool('ALLOW_SQLITE_FALLBACK', True)
    SQLITE_PATH = str(Path(os.getenv('SQLITE_PATH') or BASE_DIR / 'medisense.db').expanduser().resolve())
    CORS_ORIGINS = [origin.strip().rstrip('/') for origin in os.getenv('CORS_ORIGINS', '').split(',') if origin.strip()]
    ALLOW_LOCAL_ORIGINS = env_bool('ALLOW_LOCAL_ORIGINS', True)
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
    MAX_PDF_PAGES = int(os.getenv('MAX_PDF_PAGES', '30'))
    ANALYSES_PER_HOUR = int(os.getenv('ANALYSES_PER_HOUR', '20'))
    ALLOWED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg'}


settings = Settings()
