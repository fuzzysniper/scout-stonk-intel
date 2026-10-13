"""Synthetic ops fixtures and disposable Git repos; no provider requests, dispatch or production writes."""
import copy
import datetime as dt
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import audit_collector as audit
import collect_rewards as collector

NOW = dt.datetime(2026, 10, 13, 16, 29, 25, tzinfo=dt.timezone.utc)
ACTIVE = '2026-10-12T15:42:15.000Z'
TOKENS = json.loads((ROOT / 'data/tracked-mints.json').read_text())


def run(rid, created='2026-10-13T11:51:10Z', event='schedule', **extra):
    return {'id': rid, 'event': event, 'created_at': created, 'updated_at': created, 'head_branch': 'main',
            'path': '.github/workflows/reward-snapshots.yml', 'status': 'completed', 'conclusion': 'success', **extra}


def cadence(rows, total=None):
    return audit.recent_cadence({'workflow_runs': rows, 'total_count': len(rows) if total is None else total}, NOW, ACTIVE)


class CollectorOpsTests(unittest.TestCase):
    def test_missed_opportunities_manual_runs_and_late_creation_are_separate(self):
        rows = [run(3), run(2, '2026-10-13T03:35:41Z'), run(1, '2026-10-12T23:01:12Z'),
                run(4, '2026-10-12T20:32:28Z', 'workflow_dispatch')]
        result = cadence(rows)
        self.assertEqual(result['state'], 'checked')
        self.assertEqual((result['nominalSlots'], result['matureSlots']), (24, 23))
        self.assertEqual((result['listedScheduledRuns'], result['listedManualRuns']), (3, 1))
        self.assertEqual(result['matureSlotsWithoutRunCreation'], 20)
        self.assertEqual(result['creationOffsets'][0]['secondsAfterPriorSlot'], 2050)
        self.assertFalse(result['intendedSlotsKnown'])
        self.assertIn('do not identify intended slots', audit.cadence_summary(result))

    def test_recent_grace_slot_is_not_a_mature_missing_opportunity(self):
        self.assertEqual(cadence([])['matureSlotsWithoutRunCreation'], 23)
        result = cadence([run(1, '2026-10-13T16:18:00Z')])
        self.assertEqual(result['listedScheduledRuns'], 1)
        self.assertEqual(result['matureSlotsWithoutRunCreation'], 23)

    def test_duplicate_hour_attempts_cannot_fill_two_different_hourly_slots(self):
        result = cadence([run(2, '2026-10-13T11:52:00Z'), run(1)])
        self.assertEqual(result['listedScheduledRuns'], 2)
        self.assertEqual(result['matureSlotsWithoutRunCreation'], 22)
        self.assertIsNone(cadence([run(1), run(1)])['matureSlotsWithoutRunCreation'])

    def test_truncated_page_never_claims_missed_runs_but_oldest_boundary_proves_coverage(self):
        result = cadence([run(1)], total=100)
        self.assertEqual(result['state'], 'incomplete')
        self.assertIsNone(result['matureSlotsWithoutRunCreation'])
        self.assertIn('lower bounds', audit.cadence_summary(result))
        result = cadence([run(2), run(1, '2026-10-12T16:29:25Z')], total=100)
        self.assertEqual(result['state'], 'checked')
        self.assertIsNotNone(result['matureSlotsWithoutRunCreation'])

    def test_invalid_or_unordered_evidence_does_not_become_false_zero_execution(self):
        self.assertEqual(cadence([run(1, '2026-10-12T23:01:12Z'), run(2)])['state'], 'incomplete')
        for row in [run(1, 'bad'), run(1, '2026-10-14T00:00:00Z'), run('bad')]:
            with self.assertRaises((ValueError, TypeError)): cadence([row])
        self.assertIn('not zero execution', audit.cadence_summary({'state': 'unavailable'}))

    def test_window_never_counts_slots_before_workflow_existed(self):
        page = {'workflow_runs': [], 'total_count': 0}
        result = audit.recent_cadence(page, NOW, '2026-10-13T16:20:00Z')
        self.assertEqual(result['nominalSlots'], 0)
        with self.assertRaises(ValueError):
            audit.recent_cadence(page, NOW, '2026-10-13T17:00:00Z')

    def test_partial_provider_failure_is_not_a_missing_scheduled_attempt_or_full_data_success(self):
        store, summary = {}, {}
        def fetcher(token):
            if token['mint'] == TOKENS[1]['mint']: raise collector.CollectionError('provider_rate_limited')
            return {'observedAt': NOW.isoformat(), 'distributedTokens': 1}
        collector.collect(TOKENS[:2], store, fetcher, lambda _: None, summary)
        self.assertEqual(summary['overall'], 'partial')
        self.assertNotIn(TOKENS[1]['mint'], store)
        result = cadence([run(1)])
        self.assertEqual(result['listedScheduledRuns'], 1)
        self.assertNotIn('persistedObservations', result)

    def test_persistence_failure_remains_separate_from_green_run_and_schedule_presence(self):
        clean = audit.summarize_runs([run(1)], {'jobs': [{'steps': [
            {'name': 'Collect observations', 'conclusion': 'success'},
            {'name': 'Persist observations and summary', 'conclusion': 'failure'}]}]})
        self.assertEqual(clean[0]['commitStep'], 'failure')
        self.assertEqual(clean[0]['conclusion'], 'success')
        self.assertNotIn('confirmedCommit', clean[0])
        self.assertEqual(cadence([run(1)])['listedScheduledRuns'], 1)

    def test_audit_overlap_does_not_replace_collector_attempts_and_existing_serialization_is_preserved(self):
        # Audit runs are a different workflow; they cannot fill the collector's expected slots.
        other = run(2, '2026-10-13T11:51:15Z', path='.github/workflows/data-health.yml')
        self.assertEqual(cadence([other, run(1)])['listedScheduledRuns'], 1)
        for filename in ['reward-snapshots.yml', 'data-health.yml']:
            text = (ROOT / '.github/workflows' / filename).read_text()
            self.assertIn('group: reward-snapshots\n  cancel-in-progress: false', text)
        # Keep main-only guards, explicit non-force publication and failure artifacts in the real workflow.
        text = (ROOT / '.github/workflows/reward-snapshots.yml').read_text()
        self.assertIn("if: github.ref == 'refs/heads/main'", text)
        self.assertIn('git push origin HEAD:main', text)
        self.assertIn('if: always()', text)
        self.assertNotIn('--force', text)

    def test_stale_observations_stay_stale_despite_green_schedule_and_recover_only_with_real_input(self):
        token = TOKENS[0]
        old = {'observedAt': (NOW-dt.timedelta(hours=7)).isoformat(), 'distributedTokens': 1,
               'quoteMint': token['quoteMint'], 'quoteSymbol': token['quoteSymbol'], 'source': token['source']}
        store = {token['mint']: [old]}
        self.assertTrue(audit.data_failure(store, [token], NOW))
        self.assertEqual(cadence([run(1)])['listedScheduledRuns'], 1)
        previous = copy.deepcopy(store)
        summary = {}
        def fail(_): raise TimeoutError('private fixture detail')
        collector.collect([token], store, fail, lambda _: None, summary)
        self.assertEqual(store, previous)
        self.assertTrue(audit.data_failure(store, [token], NOW))
        collector.collect([token], store, lambda _: {**old, 'observedAt': NOW.isoformat()}, lambda _: None, summary)
        self.assertFalse(audit.data_failure(store, [token], NOW))
        self.assertEqual(store[token['mint']][0], old)

    def test_real_persistence_command_rejects_a_concurrent_push_without_rewriting_remote_history(self):
        # Execute the actual publication block against two disposable clones of a local bare repo.
        text = (ROOT / '.github/workflows/reward-snapshots.yml').read_text()
        block = text.split('      - name: Persist observations and summary\n', 1)[1].split('      - name:', 1)[0]
        publish = '\n'.join(line[10:] for line in block.split('        run: |\n', 1)[1].splitlines())
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            def git(cwd, *args):
                return subprocess.run(['git', *args], cwd=cwd, capture_output=True, text=True, check=True).stdout.strip()
            git(root, 'init', '--bare', '--initial-branch=main', 'remote.git')
            git(root, 'clone', str(root/'remote.git'), 'first')
            first = root/'first'
            git(first, 'config', 'user.email', 'fixture@users.noreply.github.com')
            git(first, 'config', 'user.name', 'Synthetic Test')
            (first/'data').mkdir(); (first/'data/reward-snapshots.json').write_text('{}\n')
            (first/'data/collection-summary.json').write_text('{}\n')
            git(first, 'add', 'data');git(first, 'commit', '-m', 'fixture base');git(first, 'push', 'origin', 'HEAD:main')
            git(root, 'clone', str(root/'remote.git'), 'stale')
            (first/'audit-fixture.txt').write_text('simulated overlapping audit commit\n')
            git(first, 'add', '.');git(first, 'commit', '-m', 'fixture audit');git(first, 'push', 'origin', 'HEAD:main')
            remote_before = git(first, 'rev-parse', 'HEAD')
            stale = root/'stale'; snapshot = b'{"synthetic_fixture": []}\n'
            (stale/'data/reward-snapshots.json').write_bytes(snapshot)
            (stale/'data/collection-summary.json').write_text('{"fixture": true}\n')
            result = subprocess.run(['bash', '-c', publish], cwd=stale, capture_output=True, text=True,
                                    env={**os.environ, 'GITHUB_STEP_SUMMARY': str(root/'step-summary.txt')})
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('rejected', result.stderr)
            self.assertEqual(git(first, 'ls-remote', 'origin', 'refs/heads/main').split()[0], remote_before)
            self.assertEqual((stale/'data/reward-snapshots.json').read_bytes(), snapshot)
            self.assertFalse((root/'step-summary.txt').exists())


if __name__ == '__main__': unittest.main()
