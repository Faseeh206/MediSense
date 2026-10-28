import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import Column, DateTime, Enum, Index, Integer, String, Text, URL, create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool
from app.config import settings

logger = logging.getLogger('medisense.database')
Base = declarative_base()


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class MedicalRecord(Base):
    __tablename__ = 'medical_records'
    __table_args__ = (Index('idx_created_at_desc', 'created_at'), Index('idx_owner_created', 'owner_hash', 'created_at'), Index('idx_sync_id_unique', 'sync_id', unique=True))
    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_id = Column(String(36), default=lambda: str(uuid.uuid4()), nullable=False)
    owner_hash = Column(String(64), nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    file_name = Column(String(255), nullable=False)
    record_type = Column(Enum('LAB_REPORT', 'PRESCRIPTION', name='record_type_enum', native_enum=False), nullable=False)
    extracted_data = Column(Text)
    api_enriched_data = Column(Text)
    simple_explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    def to_dict(self):
        def parsed(value):
            if not value:
                return {}
            try:
                result = json.loads(value)
                return result if isinstance(result, dict) else {'raw': value}
            except (TypeError, ValueError):
                return {'raw': value}
        return {'id': self.id, 'file_name': self.file_name, 'record_type': self.record_type,
                'extracted_data': parsed(self.extracted_data), 'api_enriched_data': parsed(self.api_enriched_data),
                'simple_explanation': self.simple_explanation,
                'created_at': self.created_at.replace(tzinfo=timezone.utc).isoformat() if self.created_at else None,
                'saved_to_history': True}


engine = None
SessionLocal = None
ACTIVE_DB_TYPE = 'UNKNOWN'
COPY_FIELDS = ['sync_id', 'owner_hash', 'deleted_at', 'file_name', 'record_type', 'extracted_data', 'api_enriched_data', 'simple_explanation', 'created_at']


def _ensure_schema(target):
    # Additive migration: existing report content is retained. Legacy rows stay
    # unassigned and cannot be claimed by the first public visitor.
    Base.metadata.create_all(target)
    columns = {column['name'] for column in inspect(target).get_columns('medical_records')}
    additions = {'sync_id': 'VARCHAR(36)', 'owner_hash': 'VARCHAR(64)', 'deleted_at': 'TIMESTAMP'}
    with target.begin() as connection:
        for name, sql_type in additions.items():
            if name not in columns:
                connection.execute(text(f'ALTER TABLE medical_records ADD COLUMN {name} {sql_type}'))
        for row in connection.execute(text('SELECT id FROM medical_records WHERE sync_id IS NULL')).all():
            connection.execute(text('UPDATE medical_records SET sync_id=:sync_id WHERE id=:id'), {'sync_id': str(uuid.uuid4()), 'id': row[0]})
    for index in MedicalRecord.__table__.indexes:
        index.create(target, checkfirst=True)


def _sqlite_engine(url=None):
    address = make_url(url) if url else URL.create('sqlite', database=settings.SQLITE_PATH)
    memory = address.database in {None, '', ':memory:'}
    if not memory:
        Path(address.database).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)
    return create_engine(address, connect_args={'check_same_thread': False}, **({'poolclass': StaticPool} if memory else {}))


def init_db():
    global engine, SessionLocal, ACTIVE_DB_TYPE
    if engine is not None:
        engine.dispose()
    engine = None; SessionLocal = None
    explicit_sqlite = settings.DATABASE_URL.startswith('sqlite:')
    if settings.DATABASE_BACKEND == 'sqlite' or explicit_sqlite:
        local = _sqlite_engine(settings.DATABASE_URL if explicit_sqlite else None)
        _ensure_schema(local)
        engine = local; ACTIVE_DB_TYPE = 'SQLite'
    else:
        if settings.DATABASE_BACKEND not in {'auto', 'postgres', 'postgresql'}:
            raise RuntimeError('DATABASE_BACKEND must be sqlite, postgres, or auto')
        pg_engine = None
        try:
            if settings.DATABASE_URL:
                address = make_url(settings.DATABASE_URL.replace('postgres://', 'postgresql://', 1)).set(drivername='postgresql+psycopg2')
            else:
                address = URL.create('postgresql+psycopg2', username=settings.POSTGRES_USER, password=settings.POSTGRES_PASSWORD or None, host=settings.POSTGRES_HOST, port=settings.POSTGRES_PORT, database=settings.POSTGRES_DATABASE)
            pg_engine = create_engine(address, pool_pre_ping=True, pool_recycle=1800, connect_args={'connect_timeout': 2})
            _ensure_schema(pg_engine)
            engine = pg_engine; ACTIVE_DB_TYPE = 'PostgreSQL'
        except Exception as error:
            if pg_engine is not None:
                pg_engine.dispose()
            if not settings.ALLOW_SQLITE_FALLBACK:
                raise RuntimeError('The configured primary database is unavailable and local fallback is disabled') from None
            logger.warning('Primary database unavailable (%s); using configured local fallback', type(error).__name__)
            local = _sqlite_engine(); _ensure_schema(local)
            engine = local; ACTIVE_DB_TYPE = 'SQLite (Local Dev Fallback)'
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    if ACTIVE_DB_TYPE == 'PostgreSQL' and settings.ALLOW_SQLITE_FALLBACK:
        sync_sqlite_to_postgres(engine)
    logger.info('Database ready: %s', ACTIVE_DB_TYPE)
    return True


def _copy(source, destination):
    for field in COPY_FIELDS:
        setattr(destination, field, getattr(source, field))


def _mirror(record):
    replica = _sqlite_engine()
    try:
        _ensure_schema(replica)
        factory = sessionmaker(bind=replica)
        with factory() as local:
            copy = local.query(MedicalRecord).filter_by(sync_id=record.sync_id).first()
            if copy is None:
                copy = MedicalRecord(); local.add(copy)
            if copy.owner_hash not in {None, record.owner_hash}:
                raise RuntimeError('Replica ownership mismatch')
            _copy(record, copy); local.commit()
    finally:
        replica.dispose()


def save_record_synced(db, file_name, record_type, extracted_data, api_enriched_data, simple_explanation, owner_hash=None):
    record = MedicalRecord(file_name=file_name, record_type=record_type, extracted_data=extracted_data, api_enriched_data=api_enriched_data, simple_explanation=simple_explanation, owner_hash=owner_hash)
    db.add(record)
    try:
        db.commit(); db.refresh(record)
    except Exception:
        db.rollback(); raise
    if ACTIVE_DB_TYPE.startswith('PostgreSQL') and settings.ALLOW_SQLITE_FALLBACK:
        try:
            _mirror(record)
        except Exception as error:
            logger.warning('Primary save succeeded but local mirror failed (%s)', type(error).__name__)
    return record


def delete_record_synced(db, record_id, owner_hash=None):
    record = db.query(MedicalRecord).filter_by(id=record_id, owner_hash=owner_hash, deleted_at=None).first()
    if record is None:
        return False
    # Retain only a non-content tombstone, so reconnecting replicas cannot
    # resurrect a deleted explanation or its original filename.
    record.deleted_at = utcnow(); record.file_name = ''
    record.extracted_data = None; record.api_enriched_data = None; record.simple_explanation = ''
    try:
        db.commit(); db.refresh(record)
    except Exception:
        db.rollback(); raise
    if ACTIVE_DB_TYPE.startswith('PostgreSQL') and settings.ALLOW_SQLITE_FALLBACK:
        try:
            _mirror(record)
        except Exception as error:
            logger.warning('Primary deletion succeeded but local mirror failed (%s)', type(error).__name__)
    return True


def sync_sqlite_to_postgres(pg_engine=None):
    target = pg_engine or engine
    if target is None or not ACTIVE_DB_TYPE.startswith('PostgreSQL'):
        return {'synced': 0, 'message': 'PostgreSQL is not the active database.'}
    if not Path(settings.SQLITE_PATH).is_file():
        return {'synced': 0, 'message': 'No local replica exists.'}
    replica = _sqlite_engine()
    try:
        _ensure_schema(replica)
        Local = sessionmaker(bind=replica); Primary = sessionmaker(bind=target)
        count = 0
        with Local() as local, Primary() as primary:
            for source in local.query(MedicalRecord).all():
                destination = primary.query(MedicalRecord).filter_by(sync_id=source.sync_id).first()
                if destination is None and source.owner_hash is None and source.deleted_at is None:
                    destination = primary.query(MedicalRecord).filter_by(owner_hash=None, file_name=source.file_name, created_at=source.created_at).first()
                    if destination:
                        source.sync_id = destination.sync_id
                if destination is None:
                    destination = MedicalRecord(); _copy(source, destination); primary.add(destination); primary.flush(); count += 1
                elif destination.owner_hash != source.owner_hash:
                    logger.warning('Skipped a replica record with inconsistent ownership')
                elif source.deleted_at is not None:
                    _copy(source, destination); count += 1
                elif destination.deleted_at is not None:
                    _copy(destination, source); count += 1
            primary.commit(); local.commit()
        return {'synced': count, 'message': f'Synchronized {count} record changes.'}
    except Exception as error:
        logger.warning('Replica synchronization failed (%s)', type(error).__name__)
        return {'synced': 0, 'error': 'Replica synchronization could not be completed.'}
    finally:
        replica.dispose()


def get_active_db_type():
    return ACTIVE_DB_TYPE


def get_db():
    if SessionLocal is None:
        init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
