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
    IS_VERCEL = os.getenv('VERCEL') == '1'
    PROJECT_NAME = 'MediSense'
    VERSION = '2.4.0'
    API_PREFIX = '/api'
    ANALYSIS_PROVIDER = os.getenv('ANALYSIS_PROVIDER', 'openrouter').strip().lower()
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '').strip()
    OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'nvidia/nemotron-3.5-super-vl:free').strip()
    OPENROUTER_BASE_URL = os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1').strip().rstrip('/')
    OPENROUTER_TIMEOUT_SECONDS = float(os.getenv('OPENROUTER_TIMEOUT_SECONDS', '90'))
    OPENROUTER_MAX_OUTPUT_TOKENS = int(os.getenv('OPENROUTER_MAX_OUTPUT_TOKENS', '8192'))
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash').strip().removeprefix('models/')
    GEMINI_TIMEOUT_SECONDS = float(os.getenv('GEMINI_TIMEOUT_SECONDS', '60'))
    GEMINI_MAX_OUTPUT_TOKENS = int(os.getenv('GEMINI_MAX_OUTPUT_TOKENS', '8192'))
    ADMIN_API_TOKEN = os.getenv('ADMIN_API_TOKEN', '').strip()
    DATABASE_BACKEND = os.getenv('DATABASE_BACKEND', 'postgres' if IS_VERCEL else 'auto').strip().lower()
    DATABASE_URL = os.getenv('DATABASE_URL', '').strip()
    ALLOW_STATELESS_ANALYSIS = env_bool('ALLOW_STATELESS_ANALYSIS', IS_VERCEL and not DATABASE_URL)
    POSTGRES_HOST = os.getenv('POSTGRES_HOST', '127.0.0.1')
    POSTGRES_PORT = int(os.getenv('POSTGRES_PORT', '5432') or '5432')
    POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
    POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', '')
    POSTGRES_DATABASE = os.getenv('POSTGRES_DATABASE', 'medisense_db')
    ALLOW_SQLITE_FALLBACK = env_bool('ALLOW_SQLITE_FALLBACK', not IS_VERCEL)
    SQLITE_PATH = str(Path(os.getenv('SQLITE_PATH') or BASE_DIR / 'medisense.db').expanduser().resolve())
    CORS_ORIGINS = [origin.strip().rstrip('/') for origin in os.getenv('CORS_ORIGINS', '').split(',') if origin.strip()]
    ALLOW_LOCAL_ORIGINS = env_bool('ALLOW_LOCAL_ORIGINS', not IS_VERCEL)
    MAX_FILE_SIZE_BYTES = int(os.getenv('MAX_UPLOAD_BYTES', str((4 if IS_VERCEL else 10) * 1024 * 1024)))
    MAX_PDF_PAGES = int(os.getenv('MAX_PDF_PAGES', '30'))
    ANALYSES_PER_HOUR = int(os.getenv('ANALYSES_PER_HOUR', '20'))
    ALLOWED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg'}

    @property
    def analysis_configured(self):
        if self.ANALYSIS_PROVIDER == 'openrouter':
            return usable_api_key(self.OPENROUTER_API_KEY)
        return self.ANALYSIS_PROVIDER == 'gemini' and usable_api_key(self.GEMINI_API_KEY)

    @property
    def requires_demo_document(self):
        return self.ANALYSIS_PROVIDER == 'openrouter'

    @property
    def stateless_analysis_enabled(self):
        return self.ALLOW_STATELESS_ANALYSIS and self.IS_VERCEL and not self.DATABASE_URL


settings = Settings()
