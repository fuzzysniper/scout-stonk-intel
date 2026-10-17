#!/usr/bin/env python3
"""Private /tmp-only persistence rehearsal. No live-source client or output path.

All counter-containing files are mode 0600 inside a fresh mode-0700 temporary
directory and removed in finally. Stdout contains allowlisted metadata only.
"""
import datetime as dt
import os
import pathlib
import sys
import tempfile

from scripts import coverage_candidates as c
from scripts import coverage_candidate_report as retained
from scripts import coverage_shadow_canary as s

ROOT = pathlib.Path(__file__).resolve().parents[1]
COHORT = ROOT / 'research/shadow-canary-v1.json'
NAMES = ('dataset.json', 'summary.json', 'manifest.json')


def retained_canary(cohort_bytes, catalog_bytes, evidence_bytes):
    catalog, packets, _ = retained.retained_inputs(catalog_bytes, evidence_bytes)
    p = s.request_plan(cohort_bytes, catalog_bytes)
    chosen = [packet for packet in packets if packet['source'] in p['requests']]
    c.need(len(chosen) == 5, 'canary_receipt_budget')
    return catalog, chosen, max((p['capturedAt'] for p in chosen), key=c.time)


def _write(path, raw):
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
    fd = os.open(path, flags, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(raw)
        stream.flush()
        os.fsync(stream.fileno())


def _read(path, limit):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, 'rb') as stream:
        raw = stream.read(limit + 1)
    c.need(len(raw) <= limit, 'shadow_byte_capacity')
    return raw


class RehearsalDirectory:
    """Owns its fresh /tmp directory; cannot select a repo/operator output root."""
    def __init__(self, cohort_bytes, catalog_bytes):
        c.need(os.name == 'posix' and hasattr(os, 'O_NOFOLLOW'), 'local_rehearsal_unavailable')
        self.cohort, self.catalog = cohort_bytes, catalog_bytes
        s.context(cohort_bytes, catalog_bytes)
        self._temporary = None
        self.root = None

    def __enter__(self):
        self._temporary = tempfile.TemporaryDirectory(prefix='scout-shadow85-', dir='/tmp')
        self.root = pathlib.Path(self._temporary.name)
        os.chmod(self.root, 0o700)
        return self

    def __exit__(self, *_):
        self._temporary.cleanup()

    def _version(self, generation):
        c.need(c.integer(generation, s.LIMITS['versions'] - 1), 'version_capacity')
        return self.root / ('generation-%03d' % generation)

    def _load(self, generation):
        directory = self._version(generation)
        c.need(directory.is_dir() and not directory.is_symlink() and
               {p.name for p in directory.iterdir()} == set(NAMES), 'shadow_version_unavailable')
        return s.Snapshot(*[_read(directory / name, limit) for name, limit in
                            zip(NAMES, (s.LIMITS['datasetBytes'], s.LIMITS['summaryBytes'], 4096))])

    def verify_chain(self, generation):
        previous, snapshot = None, None
        for index in range(generation + 1):
            snapshot = self._load(index)
            s.verify_snapshot(snapshot, self.cohort, self.catalog, previous)
            previous = snapshot.dataset
        return snapshot

    def _select(self, generation):
        snapshot = self.verify_chain(generation)
        pointer = c.canonical({'schemaVersion': 1, 'generation': generation,
                               'manifestRevision': c.sha(snapshot.manifest)})
        staged = self.root / 'current.pending'
        try:
            _write(staged, pointer)
            os.replace(staged, self.root / 'current.json')
        finally:
            staged.unlink(missing_ok=True)

    def read_current(self):
        pointer = c.decode(_read(self.root / 'current.json', 4096), 4096)
        c.need(set(pointer) == {'schemaVersion', 'generation', 'manifestRevision'} and
               type(pointer['schemaVersion']) is int and pointer['schemaVersion'] == 1 and
               c.integer(pointer['generation'], s.LIMITS['versions'] - 1), 'invalid_shadow_pointer')
        snapshot = self.verify_chain(pointer['generation'])
        c.need(pointer['manifestRevision'] == c.sha(snapshot.manifest), 'shadow_pointer_hash_mismatch')
        return snapshot

    def commit(self, snapshot):
        data = s.check_dataset(snapshot.dataset, self.cohort, self.catalog)
        index = data['generation']
        previous = self.read_current().dataset if (self.root / 'current.json').exists() else None
        s.verify_snapshot(snapshot, self.cohort, self.catalog, previous)
        c.need(not self._version(index).exists(), 'immutable_shadow_version_exists')
        # No eviction/overwrite/cap increase. Both staging and committed bytes count.
        size = sum(p.stat().st_size for p in self.root.rglob('*') if p.is_file())
        c.need(size + len(snapshot.dataset) + len(snapshot.summary) + len(snapshot.manifest) + 4096
               <= s.LIMITS['directoryBytes'], 'shadow_directory_capacity')
        with tempfile.TemporaryDirectory(prefix='pending-', dir=self.root) as staging:
            stage = pathlib.Path(staging)
            for name, raw in zip(NAMES, (snapshot.dataset, snapshot.summary, snapshot.manifest)):
                _write(stage / name, raw)
            saved = s.Snapshot(*[_read(stage / name, limit) for name, limit in
                                 zip(NAMES, (s.LIMITS['datasetBytes'], s.LIMITS['summaryBytes'], 4096))])
            s.verify_snapshot(saved, self.cohort, self.catalog, previous)
            os.rename(stage, self._version(index))
        self._select(index)

    def select_for_rollback_rehearsal(self, generation):
        # Temporary rehearsal only. Old immutable versions remain; no state reset.
        self._select(generation)


def run(cohort_bytes, catalog_bytes, evidence_bytes, evaluated_at):
    c.time(evaluated_at)
    _, packets, original_as_of = retained_canary(cohort_bytes, catalog_bytes, evidence_bytes)
    initial = s.initial_snapshot(cohort_bytes, catalog_bytes)
    result = s.prepare_snapshot(cohort_bytes, catalog_bytes, packets, original_as_of,
                                initial.dataset, opt_in=True)
    c.need(result['state'] == 'prepared_offline', 'historical_canary_not_accepted')
    accepted = result['artifact']
    current = s.prepare_snapshot(cohort_bytes, catalog_bytes, packets, evaluated_at,
                                 initial.dataset, opt_in=True)
    # Today's approval/eligibility are never established by an old fixture replay.
    with RehearsalDirectory(cohort_bytes, catalog_bytes) as directory:
        directory.commit(initial)
        directory.commit(accepted)
        reread = directory.read_current()
        c.need(reread == accepted, 'disk_rehearsal_mismatch')
        replay = s.prepare_snapshot(cohort_bytes, catalog_bytes, packets, original_as_of,
                                    reread.dataset, opt_in=True)
        c.need(replay['state'] == 'idempotent_replay', 'replay_not_idempotent')
        directory.select_for_rollback_rehearsal(0)
        c.need(directory.read_current() == initial and directory._version(1).exists(), 'rollback_rehearsal_failed')
        directory.select_for_rollback_rehearsal(1)
        c.need(directory.read_current() == accepted, 'restore_rehearsal_failed')
        report = s.metadata(reread, cohort_bytes, catalog_bytes)
    return {**report, 'reportEvaluatedAt': evaluated_at, 'originalReceiptValidationAsOf': original_as_of,
            'currentSourceEvaluation': current['state'],
            'currentSourceReasons': [r['reason'] for r in current.get('rows', [])],
            'liveDecision': 'NO_GO', 'rightsDecision': 'unverified_NO_GO',
            'canaryReceiptsReplayed': 5, 'localDiskHashesMatched': True,
            'initialDatasetRevision': c.sha(initial.dataset),
            'idempotentReplay': True, 'rollbackAndRestoreRehearsed': True,
            'cleanup': 'private_temporary_directory_removed',
            'hostedPersistenceVerified': False}


def main():
    try:
        c.need(sys.argv[1:] == ['--offline-rehearsal'], 'offline_rehearsal_only')
        value = run(retained.read_bounded(COHORT, 16 * 1024),
                    retained.read_bounded(retained.CATALOG, 32 * 1024),
                    retained.read_bounded(retained.EVIDENCE, 1024 * 1024),
                    dt.datetime.now(dt.timezone.utc).isoformat())
        sys.stdout.write(c.canonical(value).decode('utf-8') + '\n')
        return 0
    except Exception:
        sys.stdout.write('{"state":"unavailable","reason":"shadow_rehearsal_unavailable",'
                         '"activation":"disabled","currentEligibility":"unverified",'
                         '"financialPublication":"withheld","providerRequestsMade":0}\n')
        return 1


if __name__ == '__main__':
    sys.exit(main())
