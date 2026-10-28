"""Live synthetic extraction benchmark; all persistence is isolated SQLite.

Run with backend/.venv/Scripts/python.exe. This sends only this folder's
fictional fixtures to the configured analysis service. It never initializes PostgreSQL.
"""
import hashlib
import json
import re
import secrets
import sqlite3
import sys
import time
from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / 'backend'))
from app.config import settings

RUN_ID = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
DB_PATH = ROOT / f'local_accuracy-{RUN_ID}.db'
OUTPUT = ROOT / 'results' / RUN_ID
OUTPUT.mkdir(parents=True, exist_ok=False)
# These assignments precede importing main/database. Explicit sqlite mode wins
# over any PostgreSQL values present in the user's environment.
settings.DATABASE_BACKEND = 'sqlite'
settings.DATABASE_URL = 'sqlite:///' + DB_PATH.as_posix()
settings.SQLITE_PATH = str(DB_PATH)
settings.ANALYSES_PER_HOUR = 0  # this isolated test process only
from fastapi.testclient import TestClient
from app.main import app
from app import database


def clean(value):
    return re.sub(r'[^a-z0-9]+', '', str(value or '').lower().replace('\u00b5', 'u').replace('\u03bc', 'u'))


def canonical_numbers(value):
    value = str(value or '').lower().replace('\u2013', '-').replace('\u2014', '-').replace('\u2264', '<=').replace('\u2265', '>=')
    def normalize(match):
        try:
            return format(Decimal(match.group()).normalize(), 'f')
        except InvalidOperation:
            return match.group()
    return re.sub(r'\s+', '', re.sub(r'\d+(?:\.\d+)?', normalize, value))


def units(value):
    return clean(str(value or '').replace('\u00b3', '3').replace('^', '').replace('\u00b5', 'u').replace('\u03bc', 'u'))


def phrase(value):
    return re.sub(r'\s+', ' ', str(value or '').lower().replace('\u2013', '-').replace('\u2014', '-')).strip()


def check(items, label, expected, observed, passed=None):
    items.append({'field': label, 'expected': expected, 'observed': observed,
                  'pass': expected == observed if passed is None else bool(passed)})


def score(case, payload):
    checks = []
    data = payload.get('extracted_data') or {}
    check(checks, 'document_type', case['document_type'], payload.get('record_type'))
    actual_markers = data.get('biomarkers') or []
    actual_medicines = data.get('medicines') or []
    used_markers, used_medicines = set(), set()
    for expected in case.get('biomarkers', []):
        candidates = [(i, item) for i, item in enumerate(actual_markers)
                      if clean(item.get('test_name')) == clean(expected['test_name'])]
        found_index, found = candidates[0] if candidates else (None, {})
        if found_index is not None:
            used_markers.add(found_index)
        prefix = expected['test_name']
        check(checks, prefix + ' / name', expected['test_name'], found.get('test_name'), bool(found))
        for field in ['observed_value', 'unit', 'reference_range', 'status']:
            normalize = units if field == 'unit' else canonical_numbers if field in {'observed_value', 'reference_range'} else clean
            check(checks, prefix + ' / ' + field, expected[field], found.get(field),
                  bool(found) and normalize(expected[field]) == normalize(found.get(field)))
    for expected in case.get('medicines', []):
        names = {clean(name) for name in expected['aliases']}
        candidates = [(i, item) for i, item in enumerate(actual_medicines)
                      if names.intersection({clean(item.get('brand_name')), clean(item.get('generic_name'))})]
        found_index, found = candidates[0] if candidates else (None, {})
        if found_index is not None:
            used_medicines.add(found_index)
        prefix = expected['brand_name']
        check(checks, prefix + ' / brand', expected['brand_name'], found.get('brand_name'), clean(expected['brand_name']) == clean(found.get('brand_name')))
        check(checks, prefix + ' / generic', expected['generic_name'], found.get('generic_name'), clean(found.get('generic_name')) in {clean(alias) for alias in expected['generic_aliases']})
        check(checks, prefix + ' / strength', expected['dosage'], found.get('dosage'), canonical_numbers(expected['dosage']) == canonical_numbers(found.get('dosage')))
        check(checks, prefix + ' / form', expected['form'], found.get('form'), clean(found.get('form')) in {clean(alias) for alias in expected['form_aliases']})
        directions = phrase(found.get('frequency_instructions'))
        direction_ok = bool(found) and all(any(phrase(option) in directions for option in group) for group in expected['direction_groups'])
        check(checks, prefix + ' / directions', expected['frequency_instructions'], found.get('frequency_instructions'), direction_ok)
    extras = [item for i, item in enumerate(actual_markers) if i not in used_markers] + [item for i, item in enumerate(actual_medicines) if i not in used_medicines]
    return checks, extras


def safe_message(value):
    text = str(value)
    if settings.GEMINI_API_KEY:
        text = text.replace(settings.GEMINI_API_KEY, '[redacted]')
    return re.sub(r'AIza[\w-]+', '[redacted]', text)[:700]


def main():
    cases = json.loads((ROOT / 'ground_truth.json').read_text(encoding='utf8'))
    results, created_ids, db_checks = [], [], []
    stop_live = None
    with TestClient(app, headers={'X-Client-Token': secrets.token_hex(32)}, raise_server_exceptions=False) as client:
        health = client.get('/api/health').json()
        check(db_checks, 'Database engine', 'SQLite', health['database']['engine'], database.get_active_db_type().lower() == 'sqlite')
        for case in cases:
            name = case.get('upload_name', case['file'])
            print(f"Testing {case['id']}: {case['file']}", flush=True)
            if stop_live and case['file'].endswith('.pdf'):
                results.append({'id': case['id'], 'file': case['file'], 'skipped': stop_live, 'checks': [], 'extras': []})
                continue
            contents = (ROOT / case['file']).read_bytes()
            mime = 'application/pdf' if name.endswith('.pdf') else 'image/png'
            start = time.monotonic()
            try:
                response = client.post('/api/analyze', files={'file': (name, contents, mime)},
                                       data={'document_type': case['document_type']} if case['document_type'] else {})
                try:
                    payload = response.json()
                except ValueError:
                    payload = {'detail': 'Non-JSON response'}
                status = response.status_code
            except Exception as error:
                status, payload = 0, {'detail': safe_message(error)}
            elapsed = round(time.monotonic() - start, 2)
            checks, extras = score(case, payload) if status == 200 else ([], [])
            medicine_info = payload.get('api_enriched_data') or {}
            contexts = medicine_info.get('medications') or ([medicine_info] if medicine_info else [])
            result = {'id': case['id'], 'file': case['file'], 'sha256': hashlib.sha256(contents).hexdigest(),
                      'expected_http': case['expected_http'], 'http_status': status, 'seconds': elapsed,
                      'http_pass': status == case['expected_http'], 'checks': checks, 'extras': extras,
                      'summary_present': bool(payload.get('simple_explanation', '').strip()) if status == 200 else None,
                      'saved_to_history': payload.get('saved_to_history') if status == 200 else None,
                      'medicine_information': [{'name': item.get('medicine_name'), 'found': item.get('found'), 'status': item.get('information_status')} for item in contexts],
                      'error': safe_message(payload.get('detail', '')) if status != 200 else ''}
            results.append(result)
            (OUTPUT / (case['id'] + '.json')).write_text(json.dumps(payload, indent=2) + '\n', encoding='utf8')
            if status == 200 and payload.get('id'):
                created_ids.append(payload['id'])
            if status in {429, 503}:
                stop_live = 'Provider stopped further live tests: ' + safe_message(payload.get('detail'))
            print(json.dumps({'id': case['id'], 'http': status, 'seconds': elapsed, 'fields_passed': sum(item['pass'] for item in checks), 'fields_checked': len(checks), 'extra_items': len(extras)}), flush=True)
        history = client.get('/api/history').json()
        check(db_checks, 'Successful analyses persisted', len(created_ids), len(history))
        for record_id in created_ids:
            detail = client.get(f'/api/history/{record_id}')
            check(db_checks, f'Reload record {record_id}', 200, detail.status_code)
        foreign_headers = {'X-Client-Token': secrets.token_hex(32)}
        foreign_history = client.get('/api/history', headers=foreign_headers)
        check(db_checks, 'Other browser sees no history', [], foreign_history.json())
        if created_ids:
            first = created_ids[0]
            denied = client.get(f'/api/history/{first}', headers=foreign_headers)
            check(db_checks, 'Other browser cannot read a record', 404, denied.status_code)
            denied_delete = client.delete(f'/api/history/{first}', headers=foreign_headers)
            check(db_checks, 'Other browser cannot delete a record', 404, denied_delete.status_code)
            deleted = client.delete(f'/api/history/{first}')
            check(db_checks, 'Delete own synthetic record', 200, deleted.status_code)
            check(db_checks, 'Deleted record no longer reachable', 404, client.get(f'/api/history/{first}').status_code)
            check(db_checks, 'History updates after deletion', len(created_ids) - 1, len(client.get('/api/history').json()))
            with sqlite3.connect(DB_PATH) as db:
                row = db.execute('SELECT file_name, extracted_data, api_enriched_data, simple_explanation, deleted_at FROM medical_records WHERE id=?', (first,)).fetchone()
            check(db_checks, 'Deleted content scrubbed; tombstone retained', True, bool(row and row[4] and row[0] == '' and row[1] is None and row[2] is None and row[3] == ''))
    all_fields = [item for result in results for item in result.get('checks', [])]
    positive = [item for item in results if item.get('expected_http') == 200]
    negative = [item for item in results if item.get('expected_http') not in {200, None}]
    field_pass = sum(item['pass'] for item in all_fields)
    pct = round(100 * field_pass / len(all_fields), 2) if all_fields else None
    summary = {'run': RUN_ID, 'model': settings.GEMINI_MODEL, 'database': str(DB_PATH), 'postgres_contacted': False,
               'positive_pass': sum(item['http_pass'] for item in positive), 'positive_tested': len(positive),
               'negative_pass': sum(item['http_pass'] for item in negative), 'negative_tested': len(negative),
               'field_pass': field_pass, 'field_count': len(all_fields), 'field_percent': pct,
               'unexpected_extra_items': sum(len(item.get('extras', [])) for item in results),
               'database_checks_pass': sum(item['pass'] for item in db_checks), 'database_checks_count': len(db_checks),
               'results': results, 'database_checks': db_checks}
    (OUTPUT / 'benchmark.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf8')
    lines = ['MEDISENSE - SYNTHETIC DOCUMENT ACCURACY AND LOCAL DATABASE CHECK',
             'Run: ' + RUN_ID, 'Completed (Pakistan time): ' + datetime.now(timezone(timedelta(hours=5))).isoformat(timespec='seconds'),
             'Gemini model: ' + settings.GEMINI_MODEL, 'Real key read from backend environment; key omitted from every artifact.',
             'Only fictional fixtures were submitted. No real patient documents were used.',
             'Database: ' + str(DB_PATH), 'PostgreSQL: NOT CONTACTED. Existing backend/medisense.db: NOT USED by this benchmark.', '',
             'SUMMARY', f"Positive-document requests: {summary['positive_pass']}/{len(positive)} passed.",
             f"Negative-document requests: {summary['negative_pass']}/{len(negative)} rejected as expected.",
             f'Extraction fields checked on successful requests: {field_pass}/{len(all_fields)} ({pct}%).',
             f"Unexpected extra extracted items: {summary['unexpected_extra_items']}.",
             f"Local database/isolation checks: {summary['database_checks_pass']}/{len(db_checks)} passed.", '',
             'METHOD AND LIMITS',
             'Ground truth was written before the service was called (ground_truth.json).',
             'Lab checks: exact test identity, numeric value, unit, printed reference range and flag.',
             'Prescription checks: brand, generic, strength, form and all required direction elements.',
             'Whitespace, capitalization and equivalent numeric formatting are normalized. Medicine',
             'form/name aliases and explicitly enumerated direction phrases are accepted; missing',
             'directions are failures. No unit rescaling or inferred missing values earns a pass.',
             'Percentages cover tested fields only; failed/skipped documents are reported separately.',
             'Summary presence is a completeness check. Medical interpretation, specialist advice,',
             'handwriting, low-quality photos, rare medicines and diagnosis are NOT validated here.',
             'These few clean synthetic documents do not establish clinical accuracy or safety.',
             'Medicine-information availability is reported separately; medical interpretation is not validated.', '', 'PER-DOCUMENT RESULTS']
    for result in results:
        lines += ['', result['id'] + ' - ' + result['file']]
        if result.get('skipped'):
            lines.append('SKIPPED: ' + result['skipped'])
            continue
        lines += [f"HTTP {result['http_status']} (expected {result['expected_http']}): {'PASS' if result['http_pass'] else 'FAIL'} / {result['seconds']} seconds",
                  'Fixture SHA256: ' + result['sha256']]
        if result['error']:
            lines.append('Service response: ' + result['error'])
        if result['summary_present'] is not None:
            lines += ['Summary supplied: ' + str(result['summary_present']), 'Saved to test history: ' + str(result['saved_to_history'])]
        for item in result['checks']:
            lines += [f"  {'PASS' if item['pass'] else 'FAIL'} {item['field']}", '    Expected: ' + str(item['expected']), '    Observed: ' + str(item['observed'])]
        if result['extras']:
            lines.append('Unexpected extracted items: ' + json.dumps(result['extras']))
        for context in result['medicine_information']:
            lines.append('  Medicine information: ' + json.dumps(context))
    lines += ['', 'LOCAL DATABASE CHECKS']
    for item in db_checks:
        lines.append(f"{'PASS' if item['pass'] else 'FAIL'} {item['field']}: expected {item['expected']!r}; observed {item['observed']!r}")
    lines += ['', 'RAW SYNTHETIC RESPONSES', str(OUTPUT), '', 'No secrets, real patient identifiers or live PostgreSQL data are included.']
    (ROOT / 'accuracy_report.txt').write_text('\n'.join(lines) + '\n', encoding='utf8')
    print(json.dumps({key: value for key, value in summary.items() if key not in {'results', 'database_checks'}}, indent=2), flush=True)


if __name__ == '__main__':
    main()
