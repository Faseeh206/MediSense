import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from app import database
from app.config import settings


class LocalDatabaseTests(unittest.TestCase):
    def setUp(self):
        self.test_root = Path(__file__).resolve().parent / '.state'
        self.test_root.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix='database-', dir=self.test_root)
        self.root = Path(self.temp.name)
        self.engines = []

    def tearDown(self):
        for engine in self.engines:
            engine.dispose()
        if not self.root.resolve().is_relative_to(self.test_root.resolve()):
            raise RuntimeError('Refusing cleanup outside local test workspace')
        self.temp.cleanup()

    def engine(self, name):
        engine = create_engine('sqlite:///' + (self.root / name).as_posix())
        self.engines.append(engine)
        return engine

    def test_legacy_sqlite_migration_is_additive_and_idempotent(self):
        path = self.root / 'legacy.db'
        with sqlite3.connect(path) as connection:
            connection.execute('CREATE TABLE medical_records (id INTEGER PRIMARY KEY, file_name VARCHAR(255) NOT NULL, record_type VARCHAR(12) NOT NULL, extracted_data TEXT, api_enriched_data TEXT, simple_explanation TEXT NOT NULL, created_at DATETIME NOT NULL)')
            connection.execute("INSERT INTO medical_records VALUES (7, 'synthetic-legacy.pdf', 'LAB_REPORT', '{\"value\":118}', '{}', 'Original synthetic content', '2026-01-01 00:00:00')")
        connection.close()
        engine = self.engine('legacy.db')
        database._ensure_schema(engine)
        with sessionmaker(bind=engine)() as session:
            row = session.get(database.MedicalRecord, 7)
            sync_id = row.sync_id
            self.assertEqual(row.file_name, 'synthetic-legacy.pdf')
            self.assertEqual(row.extracted_data, '{"value":118}')
            self.assertEqual(row.simple_explanation, 'Original synthetic content')
            self.assertIsNone(row.owner_hash)
            self.assertIsNone(row.deleted_at)
            self.assertTrue(sync_id)
        database._ensure_schema(engine)
        with sessionmaker(bind=engine)() as session:
            self.assertEqual(session.query(database.MedicalRecord).count(), 1)
            self.assertEqual(session.get(database.MedicalRecord, 7).sync_id, sync_id)
        self.assertIn('idx_owner_created', {item['name'] for item in inspect(engine).get_indexes('medical_records')})

    def test_explicit_sqlite_mode_never_constructs_postgres_engine(self):
        original_create = database.create_engine
        created_drivers = []
        def construct(address, **kwargs):
            created_drivers.append(address.drivername)
            engine = original_create(address, **kwargs)
            self.engines.append(engine)
            return engine
        previous = database.engine, database.SessionLocal, database.ACTIVE_DB_TYPE
        try:
            with patch.object(settings, 'DATABASE_BACKEND', 'sqlite'), patch.object(settings, 'DATABASE_URL', ''), patch.object(settings, 'SQLITE_PATH', str(self.root / 'explicit.db')), patch.object(database, 'create_engine', side_effect=construct):
                database.init_db()
                self.assertEqual(database.ACTIVE_DB_TYPE, 'SQLite')
            self.assertEqual(created_drivers, ['sqlite'])
        finally:
            database.engine, database.SessionLocal, database.ACTIVE_DB_TYPE = previous

    def test_replica_tombstones_prevent_resurrection_using_two_sqlite_databases(self):
        # Exercise reconciliation with local SQLite engines only. No Postgres
        # connection, credentials or data are used in this test.
        primary, replica = self.engine('primary-simulation.db'), self.engine('replica.db')
        for engine in [primary, replica]:
            database._ensure_schema(engine)
        Primary, Replica = sessionmaker(bind=primary), sessionmaker(bind=replica)
        for factory in [Primary, Replica]:
            with factory() as session:
                for sync_id in ['local-deletion', 'primary-deletion']:
                    session.add(database.MedicalRecord(sync_id=sync_id, owner_hash='a' * 64, file_name='synthetic.pdf', record_type='LAB_REPORT', extracted_data='{}', api_enriched_data='{}', simple_explanation='Synthetic only'))
                session.commit()
        for factory, sync_id in [(Replica, 'local-deletion'), (Primary, 'primary-deletion')]:
            with factory() as session:
                row = session.query(database.MedicalRecord).filter_by(sync_id=sync_id).one()
                row.deleted_at = database.utcnow(); row.file_name = ''; row.extracted_data = None; row.api_enriched_data = None; row.simple_explanation = ''
                session.commit()
        with patch.object(database, 'ACTIVE_DB_TYPE', 'PostgreSQL (SQLite test simulation)'), patch.object(settings, 'SQLITE_PATH', str(self.root / 'replica.db')):
            result = database.sync_sqlite_to_postgres(primary)
        self.assertNotIn('error', result)
        for factory in [Primary, Replica]:
            with factory() as session:
                self.assertEqual(session.query(database.MedicalRecord).count(), 2)
                for row in session.query(database.MedicalRecord).all():
                    self.assertIsNotNone(row.deleted_at)
                    self.assertEqual(row.file_name, '')
                    self.assertIsNone(row.extracted_data)
                    self.assertEqual(row.simple_explanation, '')


if __name__ == '__main__':
    unittest.main()
