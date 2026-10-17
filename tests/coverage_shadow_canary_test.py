"""Real October 14 positives; every altered body/clock below is a NEGATIVE fixture.
No synthetic positive observation series or present-day eligibility is produced.
"""
import ast
import copy
import datetime as dt
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from scripts import coverage_candidates as c
from scripts import coverage_candidate_report as original
from scripts import coverage_shadow_canary as s
from scripts import coverage_shadow_rehearsal as io

ROOT = pathlib.Path(__file__).resolve().parents[1]
COHORT = (ROOT / 'research/shadow-canary-v1.json').read_bytes()
CATALOG = (ROOT / 'research/reward-candidates.json').read_bytes()
EVIDENCE = (ROOT / 'docs/evidence/pair-reward-audit-2026-10-14.json').read_bytes()
_, PACKETS, AS_OF = io.retained_canary(COHORT, CATALOG, EVIDENCE)
INITIAL = s.initial_snapshot(COHORT, CATALOG)
TODAY = '2026-10-17T05:06:13Z'


def prepare(packets=None, previous=INITIAL.dataset, as_of=AS_OF):
    return s.prepare_snapshot(COHORT, CATALOG, PACKETS if packets is None else packets,
                              as_of, previous, opt_in=True)


def mutate(packets, source, mutation):
    packet = next(p for p in packets if p['source'] == source)
    body = json.loads(packet['body'])
    mutation(body)
    packet['body'] = json.dumps(body).encode()
    return packet


def negative_later(packets):
    """Synthetic NEGATIVE fixture only, for reset/cache rejection tests."""
    for packet in packets:
        if packet['source'].startswith(c.REWARDS):
            body = json.loads(packet['body'])
            body['generatedAt'] = (c.time(body['generatedAt']) + dt.timedelta(seconds=60)).isoformat()
            packet['capturedAt'] = (c.time(packet['capturedAt']) + dt.timedelta(seconds=60)).isoformat()
            packet['body'] = json.dumps(body).encode()
    return max((p['capturedAt'] for p in packets), key=c.time)


class ShadowCanaryTests(unittest.TestCase):
    def setUp(self):
        mock = patch('socket.create_connection', side_effect=AssertionError('live source forbidden'))
        mock.start();self.addCleanup(mock.stop)

    def test_exact_two_subjects_have_source_verified_identities_without_performance_selection(self):
        catalog, members, revision = s.context(COHORT, CATALOG)
        self.assertEqual({r['symbol'] for r in members}, {'GP', 'GROK'})
        self.assertEqual({r['quoteSymbol'] for r in members}, {'GLDX', 'SPCXX'})
        self.assertTrue(all(r['quoteDecimals'] == 8 for r in members))
        self.assertEqual(revision, c.sha(COHORT))
        self.assertFalse(s.request_plan(COHORT, CATALOG)['executable'])
        self.assertEqual(len(s.request_plan(COHORT, CATALOG)['requests']), 5)
        active = json.loads((ROOT / 'data/tracked-mints.json').read_bytes())
        self.assertEqual(len(active), 7)
        self.assertFalse(set(s.MINTS) & {r['mint'] for r in active})
        self.assertEqual(catalog['rights']['financialPublication'], 'withheld')

    def test_no_approval_or_rights_toggle_no_member_or_budget_drift(self):
        changes = [lambda d: d.update(activation='enabled'), lambda d: d.update(currentEligibility='verified'),
                   lambda d: d.update(ownerSelection='approved'), lambda d: d['rights'].update(retention='allowed'),
                   lambda d: d['limits'].update(requests=6), lambda d: d['limits'].update(tokens=3),
                   lambda d: d['members'][0].update(quoteDecimals=9),
                   lambda d: d['members'][0].update(mint=s.MINTS[1]), lambda d: d.update(approved=True),
                   lambda d: d['liveCollector'].update(approvedPrivateRoot='/workspace/data')]
        for change in changes:
            value = json.loads(COHORT);change(value)
            with self.assertRaises(c.Rejected):
                s.context(c.canonical(value), CATALOG)
        with self.assertRaises(c.Rejected):
            s.context(COHORT, CATALOG+b' ')
        self.assertEqual(s.prepare_snapshot(None, None, None, 'bad', None)['state'], 'inactive')

    def test_original_capture_bytes_become_only_historical_v1_shadow_records(self):
        outcome = prepare();self.assertEqual(outcome['state'], 'prepared_offline')
        snapshot = outcome['artifact'];data = s.check_dataset(snapshot.dataset, COHORT, CATALOG)
        self.assertEqual(data['generation'], 1)
        self.assertEqual(data['evidenceUse'], 'offline_retained_capture_rehearsal')
        self.assertEqual(data['previousDatasetRevision'], c.sha(INITIAL.dataset))
        for address in s.MINTS:
            rows = data['history']['tokens'][address]
            self.assertEqual(len(rows), 1)
            source = next(p for p in PACKETS if p['source'] == c.REWARDS+address+'/rewards')
            body = json.loads(source['body'])
            self.assertTrue(rows[0]['distributedRaw'] == body['rewards']['distributedRaw'])
            self.assertEqual(rows[0]['observedAt'], source['capturedAt'])
            self.assertEqual(rows[0]['providerGeneratedAt'], body['generatedAt'])
            self.assertEqual(rows[0]['receiptRevision'], c.sha(source['body']))
        self.assertEqual(repr(snapshot), 'Snapshot()')
        verified = s.verify_snapshot(snapshot, COHORT, CATALOG, INITIAL.dataset)
        self.assertFalse(verified['diskOrHostedPersistenceProven'])

    def test_source_failure_is_atomic_for_both_tokens_and_today_is_unverified(self):
        for change in [lambda d: d.update(mode='standard'), lambda d: d.update(mint=s.MINTS[1]),
                       lambda d: d['quote'].update(decimals=9), lambda d: d.update(rewards=None),
                       lambda d: d.update(generatedAt='2099-01-01T00:00:00Z')]:
            packets = copy.deepcopy(PACKETS)
            mutate(packets, c.REWARDS+s.MINTS[0]+'/rewards', change)
            result = prepare(packets)
            self.assertEqual(result['state'], 'withheld');self.assertIsNone(result['artifact'])
            self.assertNotIn('distributedRaw', json.dumps(result))
        result = prepare(as_of=TODAY)
        self.assertEqual(result['state'], 'withheld')
        self.assertTrue(all(r['reason'] == 'stale_capture' for r in result['rows']))
        self.assertEqual(s.check_dataset(INITIAL.dataset, COHORT, CATALOG)['generation'], 0)

    def test_five_receipt_limit_statuses_retry_and_error_redaction(self):
        for packets in [PACKETS[:-1], PACKETS+[PACKETS[0]], [PACKETS[0]]*5]:
            with self.assertRaises(c.Rejected):
                prepare(packets)
        for status in [429, 503, None, 301, 401, 403, 500]:
            packets = copy.deepcopy(PACKETS)
            packets[-1].update(status=status, body=b'private-provider-error')
            packets[-1]['headers']['retry-after'] = '120'
            result = prepare(packets)
            self.assertEqual(result['state'], 'withheld');self.assertIsNone(result['artifact'])
            self.assertNotIn('private-provider-error', json.dumps(result))
        packets = copy.deepcopy(PACKETS);packets[0]['body'] = b'x'*(c.POLICY['registryBytes']+1)
        with self.assertRaises(c.Rejected):
            prepare(packets)
        packets = copy.deepcopy(PACKETS);packets[-1]['source'] = 'https://untrusted.invalid'
        with self.assertRaises(c.Rejected):
            prepare(packets)

    def test_local_fingerprint_is_not_provider_epoch_and_cannot_cross_units(self):
        snapshot = prepare()['artifact']
        metadata = s.metadata(snapshot, COHORT, CATALOG)
        self.assertFalse(metadata['providerEpochVerified'])
        self.assertTrue(all(r['kind'] == 'local_configuration_fingerprint' and r['providerEpoch'] is None
                            for r in metadata['configurations']))
        data = json.loads(snapshot.dataset)
        data['configurations'][0]['providerEpoch'] = 'invented'
        with self.assertRaises(c.Rejected):
            s.check_dataset(c.canonical(data), COHORT, CATALOG)
        data = json.loads(snapshot.dataset)
        row = data['history']['tokens'][s.MINTS[0]][0]
        row['quoteMint'] = s.MINTS[1]
        with self.assertRaises(c.Rejected):
            s.check_dataset(c.canonical(data), COHORT, CATALOG)

    def test_duplicate_real_snapshot_does_not_create_a_new_generation(self):
        snapshot = prepare()['artifact']
        replay = prepare(previous=snapshot.dataset)
        self.assertEqual(replay['state'], 'idempotent_replay')
        self.assertIsNone(replay['artifact'])
        self.assertEqual(s.check_dataset(snapshot.dataset, COHORT, CATALOG)['generation'], 1)

    def test_negative_reset_and_mixed_cached_batch_cannot_mutate_previous_bytes(self):
        snapshot = prepare()['artifact'];before = c.sha(snapshot.dataset)
        packets = copy.deepcopy(PACKETS);negative_as_of = negative_later(packets)
        mutate(packets, c.REWARDS+s.MINTS[0]+'/rewards', lambda d: d['rewards'].update(distributedRaw='0'))
        with self.assertRaisesRegex(c.Rejected, 'counter_reset_quarantined'):
            prepare(packets, snapshot.dataset, negative_as_of)
        packets = copy.deepcopy(PACKETS)
        one = next(p for p in packets if p['source'] == c.REWARDS+s.MINTS[0]+'/rewards')
        negative_as_of = negative_later([one])
        with self.assertRaisesRegex(c.Rejected, 'mixed_new_and_cached_batch'):
            prepare(packets, snapshot.dataset, negative_as_of)
        self.assertEqual(c.sha(snapshot.dataset), before)

    def test_all_three_hashes_parent_summary_and_schema_fail_closed(self):
        snapshot = prepare()['artifact']
        for index in range(3):
            parts = [snapshot.dataset, snapshot.summary, snapshot.manifest]
            parts[index] += b' '
            with self.assertRaises(c.Rejected):
                s.verify_snapshot(s.Snapshot(*parts), COHORT, CATALOG, INITIAL.dataset)
        for previous in [None, INITIAL.dataset+b' ', snapshot.dataset]:
            with self.assertRaises(c.Rejected):
                s.verify_snapshot(snapshot, COHORT, CATALOG, previous)
        summary = json.loads(snapshot.summary)
        summary['historyMatch']['startedAt'] = min((r['observedAt'] for r in summary['historyMatch']['accepted']), key=c.time)
        summary_bytes = c.canonical(summary)
        manifest = json.loads(snapshot.manifest);manifest['summaryRevision'] = c.sha(summary_bytes)
        with self.assertRaisesRegex(c.Rejected, 'shadow_source_window_mismatch'):
            s.verify_snapshot(s.Snapshot(snapshot.dataset, summary_bytes, c.canonical(manifest)), COHORT, CATALOG, INITIAL.dataset)
        for key, value in [('generation', 74), ('schemaVersion', True), ('kind', 'other'), ('evidenceUse', 'live')]:
            data = json.loads(snapshot.dataset);data[key] = value
            with self.assertRaises(c.Rejected):
                s.check_dataset(c.canonical(data), COHORT, CATALOG)
        with self.assertRaises(c.Rejected):
            s.check_dataset(b' '*(s.LIMITS['datasetBytes']+1), COHORT, CATALOG)

    def test_real_private_disk_readback_rollback_restore_and_cleanup(self):
        snapshot = prepare()['artifact']
        with io.RehearsalDirectory(COHORT, CATALOG) as directory:
            root = directory.root
            self.assertEqual(root.parent, pathlib.Path('/tmp'))
            self.assertEqual(root.stat().st_mode & 0o777, 0o700)
            directory.commit(INITIAL);directory.commit(snapshot)
            self.assertEqual(directory.read_current(), snapshot)
            for path in root.rglob('*'):
                if path.is_file():
                    self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            directory.select_for_rollback_rehearsal(0)
            self.assertEqual(directory.read_current(), INITIAL)
            self.assertTrue(directory._version(1).exists())
            with self.assertRaises(c.Rejected):
                directory.commit(snapshot)
            directory.select_for_rollback_rehearsal(1)
            self.assertEqual(directory.read_current(), snapshot)
        self.assertFalse(root.exists())

    def test_partial_write_and_bad_readback_leave_old_pointer_and_cleanup(self):
        snapshot = prepare()['artifact']
        for failure in ('write', 'readback'):
            with io.RehearsalDirectory(COHORT, CATALOG) as directory:
                directory.commit(INITIAL);root = directory.root
                original_write = io._write;calls = []
                def broken(path, raw):
                    calls.append(path.name)
                    if failure == 'write' and len(calls) == 2:
                        raise OSError('private-provider-error')
                    original_write(path, raw+b' ' if failure == 'readback' and path.name == 'dataset.json' else raw)
                with patch.object(io, '_write', side_effect=broken):
                    with self.assertRaises((OSError, c.Rejected)):
                        directory.commit(snapshot)
                self.assertEqual(directory.read_current(), INITIAL)
                self.assertFalse(directory._version(1).exists())
                self.assertFalse(any(p.name.startswith('pending-') for p in root.iterdir()))
            self.assertFalse(root.exists())

    def test_uncertain_pointer_after_version_write_does_not_authorize_replay(self):
        snapshot = prepare()['artifact']
        with io.RehearsalDirectory(COHORT, CATALOG) as directory:
            directory.commit(INITIAL)
            with patch.object(directory, '_select', side_effect=OSError('private-error')):
                with self.assertRaises(OSError):
                    directory.commit(snapshot)
            self.assertEqual(directory.read_current(), INITIAL)
            self.assertTrue(directory._version(1).exists())
            with self.assertRaises(c.Rejected):
                directory.commit(snapshot)
            self.assertEqual(directory.verify_chain(1), snapshot)

    def test_corrupt_committed_bytes_or_symlink_refuse_without_fallback(self):
        snapshot = prepare()['artifact']
        with io.RehearsalDirectory(COHORT, CATALOG) as directory:
            directory.commit(INITIAL);directory.commit(snapshot)
            path = directory._version(1)/'dataset.json'
            path.write_bytes(snapshot.dataset+b' ')
            with self.assertRaises(c.Rejected):
                directory.read_current()
            self.assertTrue(directory._version(0).exists())
        with io.RehearsalDirectory(COHORT, CATALOG) as directory:
            directory.commit(INITIAL)
            pointer = directory.root/'current.json';pointer.unlink()
            pointer.symlink_to(directory._version(0)/'manifest.json')
            with self.assertRaises(OSError):
                directory.read_current()

    def test_directory_retention_stops_without_evicting_old_versions(self):
        snapshot = prepare()['artifact']
        with io.RehearsalDirectory(COHORT, CATALOG) as directory:
            directory.commit(INITIAL)
            with (directory.root/'synthetic-capacity-fixture').open('wb') as stream:
                stream.truncate(s.LIMITS['directoryBytes'])
            with self.assertRaisesRegex(c.Rejected, 'shadow_directory_capacity'):
                directory.commit(snapshot)
            self.assertEqual(directory.read_current(), INITIAL)

    def test_metadata_cli_never_outputs_quantities_or_accepts_live_or_path_flags(self):
        value = io.run(COHORT, CATALOG, EVIDENCE, TODAY)
        self.assertEqual(value['liveDecision'], 'NO_GO')
        self.assertEqual(value['currentEligibility'], 'unverified')
        self.assertEqual(value['currentSourceEvaluation'], 'withheld')
        self.assertTrue(value['rollbackAndRestoreRehearsed'])
        self.assertEqual(value['newObservationsCollected'], 0)
        snapshot = prepare()['artifact']
        self.assertEqual(value['datasetRevision'], c.sha(snapshot.dataset))
        self.assertEqual(value['summaryRevision'], c.sha(snapshot.summary))
        self.assertEqual(value['manifestRevision'], c.sha(snapshot.manifest))
        self.assertIsNone(value['lifetime']);self.assertIsNone(value['recentFlow']);self.assertIsNone(value['holderReturn'])
        self.assertNotIn('distributedRaw', json.dumps(value));self.assertNotIn('walletsPaid', json.dumps(value))
        for args, expected in [(['--offline-rehearsal'], 0), ([], 1), (['--activate'], 1), (['--offline-rehearsal', '--output', '/workspace/data'], 1)]:
            result = subprocess.run([sys.executable, '-m', 'scripts.coverage_shadow_rehearsal', *args],
                                    cwd=ROOT, capture_output=True, text=True, timeout=5,
                                    env={'PATH': os.environ['PATH'], 'PYTHONDONTWRITEBYTECODE': '1'})
            self.assertEqual(result.returncode, expected);self.assertEqual(result.stderr, '')
            self.assertEqual(json.loads(result.stdout)['providerRequestsMade'], 0)
        for name in ('coverage_shadow_canary.py', 'coverage_shadow_rehearsal.py'):
            tree = ast.parse((ROOT/'scripts'/name).read_text())
            imports = [n.module for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)] + [a.name for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names]
            self.assertFalse(any(n and n.split('.')[0] in ('urllib', 'requests', 'socket', 'http', 'subprocess') for n in imports))

    def test_inert_collector_patch_applies_only_to_temp_and_denies_unknown_grants_or_stale_reads(self):
        proposal = ROOT/'research/proposals/shadow-canary-collector-v1.patch'
        self.assertFalse((ROOT/'scripts/coverage_shadow_collect.py').exists())
        with tempfile.TemporaryDirectory(prefix='scout-shadow-patch-', dir='/tmp') as temporary:
            subprocess.run(['git', 'apply', '--unsafe-paths', str(proposal)], cwd=temporary, check=True, capture_output=True)
            source = (pathlib.Path(temporary)/'scripts/coverage_shadow_collect.py').read_text()
        module = {};exec(compile(source, 'inert-proposal-only', 'exec'), module)
        def forbidden(**_):
            raise AssertionError('inactive proposal cannot call adapters')
        result = module['proposed_attempt'](COHORT, CATALOG, authorize=forbidden,
                                             read_once=forbidden, commit_private=forbidden, clock=forbidden)
        self.assertEqual(result['providerRequests'], 0)
        module['ACTIVE'] = True  # Synthetic NEGATIVE checks; this is not an activation.
        self.assertEqual(module['proposed_attempt'](COHORT, CATALOG)['reason'], 'trusted_adapters_missing')
        result = module['proposed_attempt'](COHORT, CATALOG, authorize=lambda **_: None,
                                             read_once=forbidden, commit_private=forbidden, clock=lambda: TODAY)
        self.assertEqual(result['providerRequests'], 0)
        for fail_status in (None, 429, 503):
            calls = []
            def mock_read(**kwargs):
                calls.append(kwargs)
                packet = copy.deepcopy(next(p for p in PACKETS if p['source'] == kwargs['source']))
                if fail_status:
                    packet['status'] = fail_status
                return packet
            result = module['proposed_attempt'](COHORT, CATALOG, authorize=lambda **_: object(),
                                                 read_once=mock_read, commit_private=forbidden, clock=lambda: TODAY)
            self.assertEqual(result['state'], 'NO_GO')
            self.assertEqual(len(calls), 1 if fail_status else 5)
            self.assertTrue(all(x['method'] == 'GET' and x['retries'] == 0 and x['timeout_seconds'] == 3 for x in calls))
        self.assertFalse((ROOT/'scripts/coverage_shadow_collect.py').exists())


if __name__ == '__main__':
    unittest.main()
