"""INACTIVE local reference contract. No HTTP client, credentials, deployment or Git writes.

SQLite transactions model a future durable coordinator; they do not prove a hosted
adapter's semantics. Callers must opt into simulation. All times below are trigger
metadata, never reward observation timestamps. The current workflows do not use it.
"""
from contextlib import contextmanager
from dataclasses import dataclass, field
import datetime as dt
import hashlib
import re
import sqlite3
import uuid

TARGET = 'fuzzysniper/scout-stonk-intel|reward-snapshots.yml|main'
MAX_LATE = dt.timedelta(minutes=15)
LEASE = dt.timedelta(seconds=60)
RETENTION = dt.timedelta(days=8)
MAX_SLOTS = 193
MAX_ATTEMPTS = 2


def utc(value):
    if isinstance(value, str):
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)', value):
            raise ValueError('invalid_trigger_time')
        try:
            value = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError('invalid_trigger_time') from None
    if not isinstance(value, dt.datetime) or value.tzinfo is None or value.utcoffset() != dt.timedelta(0):
        raise ValueError('invalid_trigger_time')
    return value


def iso(value):
    # Fixed precision keeps SQLite's textual UTC ordering identical to time ordering.
    return value.isoformat(timespec='microseconds').replace('+00:00', 'Z')


def slot_key(scheduled_at):
    at = utc(scheduled_at)
    if at.minute != 17 or at.second != 0 or at.microsecond != 0:
        raise ValueError('invalid_trigger_slot')
    return TARGET + '|' + at.isoformat(timespec='seconds').replace('+00:00', 'Z')


@dataclass(frozen=True)
class Decision:
    action: str
    slot: str | None = None
    claim: str | None = field(default=None, repr=False)
    attempt: int | None = None


class SlotLedger:
    """Local SQLite file must be explicitly selected (tests use disposable directories).

    A unique row/BEGIN IMMEDIATE enforces one winner across connections. Caller
    records a fixed-enum outcome using the winning nonce; raw API bodies/secrets
    are neither accepted nor logged. Persistence errors fail closed.
    """
    def __init__(self, path):
        try:
            self.db = sqlite3.connect(path, timeout=5, isolation_level=None)
            self.db.row_factory = sqlite3.Row
            self.db.executescript('''
                CREATE TABLE IF NOT EXISTS circuit (id INTEGER PRIMARY KEY CHECK(id=1), paused INTEGER NOT NULL);
                INSERT OR IGNORE INTO circuit VALUES (1, 0);
                CREATE TABLE IF NOT EXISTS slots (
                    slot TEXT PRIMARY KEY, scheduled_at TEXT NOT NULL, state TEXT NOT NULL,
                    claim TEXT NOT NULL, attempt INTEGER NOT NULL,
                    claimed_at TEXT NOT NULL, updated_at TEXT NOT NULL,
                    retry_at TEXT, run_id INTEGER);
            ''')
        except sqlite3.Error:
            raise RuntimeError('ledger_unavailable') from None

    def close(self):
        self.db.close()

    @contextmanager
    def transaction(self):
        try:
            self.db.execute('BEGIN IMMEDIATE')
            yield
            self.db.execute('COMMIT')
        except Exception as exc:
            try:
                if self.db.in_transaction:
                    self.db.execute('ROLLBACK')
            except sqlite3.Error:
                pass
            if isinstance(exc, sqlite3.Error):
                raise RuntimeError('ledger_unavailable') from None
            raise

    def receipt(self, scheduled_at):
        """Private coordinator state; use export_receipt for operator/log evidence."""
        try:
            row = self.db.execute('SELECT * FROM slots WHERE slot=?', (slot_key(scheduled_at),)).fetchone()
            return dict(row) if row else None
        except sqlite3.Error:
            raise RuntimeError('ledger_unavailable') from None

    def export_receipt(self, scheduled_at):
        """Public timing/status evidence omits the private state-transition nonce."""
        row = self.receipt(scheduled_at)
        if row is None:
            return None
        return {**{key: value for key, value in row.items() if key != 'claim'},
                'claim_hash': hashlib.sha256(row['claim'].encode()).hexdigest()}

    def reserve(self, scheduled_at, now, *, simulation_enabled=False):
        # This flag permits only local modelling, never production activation.
        if simulation_enabled is not True:
            return Decision('disabled')
        scheduled, current = utc(scheduled_at), utc(now)
        key = slot_key(scheduled)
        if current < scheduled:
            return Decision('reject_future', key)
        if current - scheduled > MAX_LATE:
            return Decision('reject_late', key)
        with self.transaction():
            if self.db.execute('SELECT paused FROM circuit WHERE id=1').fetchone()[0]:
                return Decision('circuit_paused', key)
            # Old receipts cannot authorize replay: lateness was checked before any eviction.
            cutoff = iso(current - RETENTION)
            self.db.execute('DELETE FROM slots WHERE scheduled_at < ?', (cutoff,))
            row = self.db.execute('SELECT * FROM slots WHERE slot=?', (key,)).fetchone()
            if row:
                if current < utc(row['updated_at']):
                    return Decision('reject_clock_regression', key)
                if row['state'] == 'reserved':
                    if current - utc(row['claimed_at']) < LEASE:
                        return Decision('in_flight', key)
                    self.db.execute("UPDATE slots SET state='uncertain',updated_at=? WHERE slot=?", (iso(current), key))
                    return Decision('hold_uncertain', key)
                if row['state'] != 'retry_wait':
                    return Decision('hold_uncertain' if row['state'] == 'uncertain' else 'duplicate_suppressed', key)
                if current < utc(row['retry_at']):
                    return Decision('retry_not_due', key)
                attempt = row['attempt'] + 1
                if attempt > MAX_ATTEMPTS:
                    return Decision('duplicate_suppressed', key)
            else:
                if self.db.execute('SELECT COUNT(*) FROM slots').fetchone()[0] >= MAX_SLOTS:
                    return Decision('capacity_exhausted', key)
                attempt = 1
            claim = str(uuid.uuid4())
            self.db.execute('''INSERT INTO slots VALUES (?,?,?,?,?,?,?,?,NULL)
                ON CONFLICT(slot) DO UPDATE SET state=excluded.state,claim=excluded.claim,
                attempt=excluded.attempt,claimed_at=excluded.claimed_at,updated_at=excluded.updated_at,
                retry_at=NULL''', (key, iso(scheduled), 'reserved', claim, attempt, iso(current), iso(current), None))
            return Decision('permit_simulated_dispatch', key, claim, attempt)

    def record_outcome(self, scheduled_at, claim, outcome, now, *, retry_after_seconds=None, run_id=None):
        if outcome not in ('accepted', 'uncertain', 'rate_limited', 'rejected'):
            raise ValueError('invalid_dispatch_outcome')
        if run_id is not None and (type(run_id) is not int or not 0 < run_id <= 2**53 - 1 or outcome != 'accepted'):
            raise ValueError('invalid_run_id')
        key, current = slot_key(scheduled_at), utc(now)
        with self.transaction():
            row = self.db.execute('SELECT * FROM slots WHERE slot=?', (key,)).fetchone()
            if row is None or row['claim'] != claim:
                return Decision('stale_claim', key)
            if current < utc(row['updated_at']):
                return Decision('reject_clock_regression', key)
            # A delayed known acceptance may resolve uncertainty, but never authorize another POST.
            if row['state'] != 'reserved' and not (row['state'] == 'uncertain' and outcome == 'accepted'):
                return Decision('duplicate_suppressed', key)
            state, retry_at = outcome, None
            if outcome == 'rate_limited':
                valid_delay = type(retry_after_seconds) is int and 1 <= retry_after_seconds <= 300
                retry_at = current + dt.timedelta(seconds=retry_after_seconds) if valid_delay else None
                if row['attempt'] < MAX_ATTEMPTS and retry_at and retry_at <= utc(row['scheduled_at']) + MAX_LATE:
                    state = 'retry_wait'
                else:
                    state, retry_at = 'denied', None
            elif outcome == 'rejected':
                state = 'denied'
                self.db.execute('UPDATE circuit SET paused=1 WHERE id=1')
            self.db.execute('UPDATE slots SET state=?,updated_at=?,retry_at=?,run_id=? WHERE slot=?',
                            (state, iso(current), iso(retry_at) if retry_at else None, run_id, key))
            return Decision('recorded_' + state, key, claim, row['attempt'])


def publication_preflight(expected_base, current_main, candidate_bytes, expected_revision,
                          original_allowlist, current_allowlist, original_archive, current_archive):
    """Hash/control preflight only. Not a sample validator or authorization to commit.

    Conservative conflict handling: preserve the candidate and fail instead of
    merging/rebasing against changed main. Existing collector/math checks still apply.
    """
    if not all(isinstance(sha, str) and re.fullmatch(r'[a-f0-9]{40}', sha) for sha in (expected_base, current_main)):
        return 'stop_invalid_git_evidence'
    if expected_base != current_main:
        return 'stop_main_advanced_preserve_artifacts'
    if not all(isinstance(value, bytes) and value for value in (original_allowlist, current_allowlist, original_archive, current_archive)):
        return 'stop_invalid_protected_evidence'
    if original_allowlist != current_allowlist or original_archive != current_archive:
        return 'stop_protected_input_changed'
    if not isinstance(candidate_bytes, bytes) or expected_revision != 'sha256:' + hashlib.sha256(candidate_bytes).hexdigest():
        return 'stop_candidate_hash_mismatch'
    return 'candidate_consistent_not_publication_proof'
