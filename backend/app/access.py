import hashlib
import hmac
import re
import json
import math
import time
from collections import OrderedDict
from threading import Lock
from datetime import datetime, timezone
from ipaddress import ip_address

from fastapi import Header, HTTPException, Request
from sqlalchemy import select, update, text
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from app import database
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


def analysis_client_address(request: Request):
    # Trust the platform's overwritten client-IP header only on Vercel.
    if settings.IS_VERCEL:
        forwarded = request.headers.get('x-vercel-forwarded-for', '').strip()
        try:
            return str(ip_address(forwarded))
        except ValueError:
            pass
    return request.client.host if request.client else 'unknown'


class AnalysisLimiter:

    def __init__(self):
        self._stateless_events = OrderedDict()
        self._stateless_lock = Lock()

    def _admit_stateless(self, key, limit):
        # Best-effort per-instance protection only. Hosted free inference also
        # has the provider account's global quota; this is not a shared counter.
        with self._stateless_lock:
            now = time.time()
            events = [event for event in self._stateless_events.pop(key, []) if event > now - 3600]
            self._stateless_events[key] = events
            if len(events) >= limit:
                raise HTTPException(429, 'The hourly document analysis limit was reached. Please try again later.',
                                    headers={'Retry-After': str(max(1, math.ceil(3600 - (now - events[0]))))})
            events.append(now)
            while len(self._stateless_events) > 4096:
                self._stateless_events.popitem(last=False)

    def admit(self, host):
        limit = settings.ANALYSES_PER_HOUR
        if limit <= 0:
            return
        key = hashlib.sha256((host or 'unknown').encode()).hexdigest()
        table = database.AnalysisRateLimit.__table__
        if database.engine is None:
            if settings.stateless_analysis_enabled:
                self._admit_stateless(key, limit)
                return
            raise HTTPException(503, 'The analysis service is not ready. Please try again later.')
        with database.engine.begin() as connection:
            if database.engine.dialect.name == 'sqlite':
                connection.execute(text('BEGIN IMMEDIATE'))
                insert = sqlite_insert
            else:
                insert = postgres_insert
            connection.execute(insert(table).values(identity_hash=key, events_json='[]', updated_at=database.utcnow())
                .on_conflict_do_nothing(index_elements=['identity_hash']))
            row = connection.execute(select(table.c.events_json).where(table.c.identity_hash == key).with_for_update()).one()
            # Read the shared clock after locking so queued requests are ordered.
            now = time.time() if database.engine.dialect.name == 'sqlite' else float(connection.execute(text('SELECT EXTRACT(EPOCH FROM clock_timestamp())')).scalar_one())
            timestamp = datetime.fromtimestamp(now, timezone.utc).replace(tzinfo=None)
            events = [event for event in json.loads(row.events_json) if event > now - 3600]
            if len(events) >= limit:
                retry = max(1, math.ceil(3600 - (now - events[0])))
                raise HTTPException(429, 'The hourly document analysis limit was reached. Please try again later.', headers={'Retry-After': str(retry)})
            events.append(now)
            connection.execute(update(table).where(table.c.identity_hash == key).values(events_json=json.dumps(events), updated_at=timestamp))


analysis_limiter = AnalysisLimiter()
