import hashlib
import hmac
import re
import threading
import time
from collections import deque

from fastapi import Header, HTTPException, Request
from app.config import settings


def client_owner(x_client_token: str | None = Header(None, alias='X-Client-Token')):
    if not x_client_token or not re.fullmatch(r'[a-f0-9]{64}', x_client_token):
        raise HTTPException(401, 'A private browser session is required. Reload MediSense in an up-to-date browser.')
    return hashlib.sha256(x_client_token.encode('ascii')).hexdigest()


def optional_owner(request: Request):
    token = request.headers.get('X-Client-Token', '')
    return hashlib.sha256(token.encode('ascii')).hexdigest() if re.fullmatch(r'[a-f0-9]{64}', token) else None


def require_admin(x_admin_token: str | None = Header(None, alias='X-Admin-Token')):
    configured = settings.ADMIN_API_TOKEN
    if len(configured) < 32 or not x_admin_token or not hmac.compare_digest(configured, x_admin_token):
        raise HTTPException(403, 'This administrative operation is disabled or requires valid server administrator credentials.')


class AnalysisLimiter:
    def __init__(self):
        self.events = {}
        self.lock = threading.Lock()

    def admit(self, host):
        limit = settings.ANALYSES_PER_HOUR
        if limit <= 0:
            return
        now = time.monotonic()
        key = hashlib.sha256((host or 'unknown').encode()).hexdigest()
        with self.lock:
            expired = [identity for identity, events in self.events.items() if not events or events[-1] < now - 3600]
            for identity in expired:
                del self.events[identity]
            if key not in self.events and len(self.events) >= 10000:
                raise HTTPException(429, 'The analysis service is busy. Please try again later.')
            events = self.events.setdefault(key, deque())
            while events and events[0] < now - 3600:
                events.popleft()
            if len(events) >= limit:
                retry = max(1, int(3600 - (now - events[0])))
                raise HTTPException(429, 'The hourly document analysis limit was reached. Please try again later.', headers={'Retry-After': str(retry)})
            events.append(now)


analysis_limiter = AnalysisLimiter()
