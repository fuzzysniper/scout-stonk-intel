"""Offline SQLite/ops fixtures only. No credentials, HTTP, workflow dispatch or real data mutation."""
import ast
import concurrent.futures
import datetime as dt
import hashlib
import io
import json
import pathlib
import sys
import tempfile
import threading
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import trigger_contract as contract
import collect_rewards as collector

SLOT = dt.datetime(2026, 10, 13, 17, 17, tzinfo=dt.timezone.utc)
NOW = SLOT + dt.timedelta(seconds=5)
TOKEN = json.loads((ROOT / 'data/tracked-mints.json').read_text())[0]


class TriggerContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = str(pathlib.Path(self.temp.name) / 'receipt.sqlite')
        self.ledger = contract.SlotLedger(self.path)

    def tearDown(self):
        self.ledger.close()
        self.temp.cleanup()

    def reserve(self, now=NOW, slot=SLOT):
        return self.ledger.reserve(slot, now, simulation_enabled=True)

    def test_disabled_by_default_and_no_network_or_activation_imports(self):
        self.assertEqual(self.ledger.reserve(SLOT, NOW).action, 'disabled')
        self.assertIsNone(self.ledger.receipt(SLOT))
        tree = ast.parse((ROOT / 'scripts/trigger_contract.py').read_text())
        modules = {node.module for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)}
        modules |= {alias.name for node in ast.walk(tree) if isinstance(node, ast.Import) for alias in node.names}
        self.assertEqual(modules, {'contextlib', 'dataclasses', 'datetime', 'hashlib', 're', 'sqlite3', 'uuid'})

    def test_target_and_slot_are_fixed_and_canonical_not_user_selected(self):
        expected = 'fuzzysniper/scout-stonk-intel|reward-snapshots.yml|main|2026-10-13T17:17:00Z'
        self.assertEqual(contract.slot_key(SLOT), expected)
        self.assertEqual(contract.slot_key('2026-10-13T17:17:00+00:00'), expected)
        for invalid in ['private-token-fixture', '2026-02-30T17:17:00Z', '2026-10-13T17:18:00Z', '2026-10-13T17:17:00+01:00']:
            with self.assertRaises(ValueError) as raised:contract.slot_key(invalid)
            self.assertNotIn('private-token', str(raised.exception))

    def test_future_late_and_clock_regression_never_authorize_backfill(self):
        self.assertEqual(self.reserve(SLOT-dt.timedelta(seconds=1)).action, 'reject_future')
        self.assertEqual(self.reserve(SLOT+contract.MAX_LATE+dt.timedelta(seconds=1)).action, 'reject_late')
        self.assertIsNone(self.ledger.receipt(SLOT))
        self.reserve()
        self.assertEqual(self.reserve(SLOT).action, 'reject_clock_regression')

    def test_actual_concurrent_connections_have_exactly_one_reservation_winner(self):
        barrier = threading.Barrier(4)
        def worker(_):
            ledger = contract.SlotLedger(self.path)
            try:
                barrier.wait(timeout=5)
                return ledger.reserve(SLOT, NOW, simulation_enabled=True).action
            finally:ledger.close()
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(worker, range(4)))
        self.assertEqual(results.count('permit_simulated_dispatch'), 1)
        self.assertEqual(results.count('in_flight'), 3)
        self.assertEqual(self.ledger.receipt(SLOT)['attempt'], 1)

    def test_duplicate_acceptance_survives_restart_without_a_second_dispatch(self):
        first = self.reserve()
        self.assertNotIn(first.claim, repr(first))
        self.ledger.record_outcome(SLOT, first.claim, 'accepted', NOW, run_id=123)
        self.ledger.close();self.ledger = contract.SlotLedger(self.path)
        self.assertEqual(self.reserve().action, 'duplicate_suppressed')
        self.assertEqual(self.ledger.receipt(SLOT)['run_id'], 123)
        exported = self.ledger.export_receipt(SLOT)
        self.assertNotIn('claim', exported)
        self.assertNotIn(first.claim, json.dumps(exported))
        self.assertEqual(exported['claim_hash'], hashlib.sha256(first.claim.encode()).hexdigest())

    def test_expired_reservation_is_uncertain_not_permission_to_retry(self):
        first = self.reserve()
        later = NOW+contract.LEASE
        self.assertEqual(self.reserve(later).action, 'hold_uncertain')
        self.assertEqual(self.ledger.receipt(SLOT)['attempt'], 1)
        self.assertEqual(self.ledger.record_outcome(SLOT, first.claim, 'accepted', later, run_id=123).action, 'recorded_accepted')
        self.assertEqual(self.reserve(later).action, 'duplicate_suppressed')

    def test_timeout_ambiguous_acceptance_is_not_retried_but_next_fresh_slot_can_proceed(self):
        first = self.reserve()
        self.ledger.record_outcome(SLOT, first.claim, 'uncertain', NOW)
        self.assertEqual(self.reserve(NOW+dt.timedelta(seconds=30)).action, 'hold_uncertain')
        next_slot = SLOT+dt.timedelta(hours=1)
        self.assertEqual(self.reserve(next_slot+dt.timedelta(seconds=1), next_slot).action, 'permit_simulated_dispatch')
        self.assertEqual(self.ledger.receipt(SLOT)['state'], 'uncertain')

    def test_confirmed_rate_limit_allows_only_one_due_retry_with_a_new_nonce(self):
        first = self.reserve()
        self.ledger.record_outcome(SLOT, first.claim, 'rate_limited', NOW, retry_after_seconds=30)
        self.assertEqual(self.reserve(NOW+dt.timedelta(seconds=29)).action, 'retry_not_due')
        retry_time = NOW+dt.timedelta(seconds=30)
        retry = self.reserve(retry_time)
        self.assertEqual(retry.attempt, 2)
        self.assertNotEqual(retry.claim, first.claim)
        self.assertEqual(self.ledger.record_outcome(SLOT, first.claim, 'accepted', retry_time).action, 'stale_claim')
        self.ledger.record_outcome(SLOT, retry.claim, 'rate_limited', retry_time, retry_after_seconds=30)
        self.assertEqual(self.reserve(retry_time+dt.timedelta(seconds=30)).action, 'duplicate_suppressed')
        self.assertEqual(self.ledger.receipt(SLOT)['attempt'], 2)

    def test_unbounded_retry_after_or_retry_past_slot_window_is_denied(self):
        for delay in [None, 0, 301, True, '30']:
            slot = SLOT+dt.timedelta(hours=len(str(delay)))
            ledger = contract.SlotLedger(str(pathlib.Path(self.temp.name) / (str(delay)+'.sqlite')))
            try:
                claim = ledger.reserve(slot, slot, simulation_enabled=True)
                self.assertEqual(ledger.record_outcome(slot, claim.claim, 'rate_limited', slot, retry_after_seconds=delay).action, 'recorded_denied')
            finally:ledger.close()
        first = self.reserve(SLOT+dt.timedelta(minutes=14))
        self.assertEqual(self.ledger.record_outcome(SLOT, first.claim, 'rate_limited', SLOT+dt.timedelta(minutes=14), retry_after_seconds=120).action, 'recorded_denied')

    def test_permission_rejection_pauses_all_future_slots_across_restart(self):
        first = self.reserve()
        self.ledger.record_outcome(SLOT, first.claim, 'rejected', NOW)
        self.ledger.close();self.ledger = contract.SlotLedger(self.path)
        next_slot = SLOT+dt.timedelta(hours=1)
        self.assertEqual(self.reserve(next_slot, next_slot).action, 'circuit_paused')
        self.assertIsNone(self.ledger.receipt(next_slot))

    def test_unknown_results_stale_claims_and_invalid_run_ids_do_not_change_state(self):
        first = self.reserve()
        self.assertEqual(self.ledger.record_outcome(SLOT, 'wrong nonce', 'accepted', NOW).action, 'stale_claim')
        for outcome, rid in [('private-token-fixture', None), ('accepted', True), ('accepted', -1), ('accepted', 2**53), ('uncertain', 123)]:
            with self.assertRaises(ValueError) as raised:self.ledger.record_outcome(SLOT, first.claim, outcome, NOW, run_id=rid)
            self.assertNotIn('private-token', str(raised.exception))
        self.assertEqual(self.ledger.receipt(SLOT)['state'], 'reserved')

    def test_ledger_retention_is_bounded_and_eviction_never_allows_an_old_replay(self):
        for hour in range(194):
            slot = SLOT+dt.timedelta(hours=hour)
            self.reserve(slot+dt.timedelta(microseconds=1), slot)
        self.assertLessEqual(self.ledger.db.execute('SELECT COUNT(*) FROM slots').fetchone()[0], contract.MAX_SLOTS)
        self.assertIsNone(self.ledger.receipt(SLOT))
        last = SLOT+dt.timedelta(hours=193)
        self.assertEqual(self.reserve(last, SLOT).action, 'reject_late')
        self.assertIsNone(self.ledger.receipt(SLOT))

    def test_capacity_and_unavailable_storage_fail_closed(self):
        self.ledger.db.execute('''WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<193)
            INSERT INTO slots SELECT 'synthetic-capacity-'||x, ?, 'accepted', 'fixture', 1, ?, ?, NULL, NULL FROM n''',
            (contract.iso(SLOT), contract.iso(NOW), contract.iso(NOW)))
        self.assertEqual(self.reserve().action, 'capacity_exhausted')
        self.ledger.close();self.ledger = contract.SlotLedger(self.path)
        self.ledger.db.execute('DROP TABLE slots')
        with self.assertRaisesRegex(RuntimeError, '^ledger_unavailable$'):self.reserve()

    def test_scheduled_time_never_substitutes_for_collector_observed_time_or_source_identity(self):
        # Explicitly artificial response: only existing collector validation is exercised.
        actual = SLOT+dt.timedelta(minutes=4)
        value = {'data': {'mint': TOKEN['mint'], 'mode': 'reward', 'quote': {'mint': TOKEN['quoteMint'], 'symbol': TOKEN['quoteSymbol']},
                          'rewards': {'distributedTokens': 1}}, 'meta': {'generatedAt': actual.isoformat()}}
        class Response(io.BytesIO):
            def geturl(self):return TOKEN['source']
        def opener(request, timeout):
            self.assertEqual(request.full_url, TOKEN['source'])
            return Response(json.dumps(value).encode())
        self.reserve(actual)
        record = collector.fetch(TOKEN, opener, lambda: actual)
        self.assertEqual(record['observedAt'], actual.isoformat(timespec='seconds'))
        self.assertNotEqual(collector.timestamp(record['observedAt']), SLOT)
        self.assertEqual(record['providerGeneratedAt'], actual.isoformat())
        self.assertEqual(record['source'], TOKEN['source'])
        self.assertEqual(record['quoteMint'], TOKEN['quoteMint'])
        value['data']['quote']['mint'] = 'wrong'
        with self.assertRaises(collector.CollectionError):collector.fetch(TOKEN, opener, lambda: actual)
        value['data']['quote']['mint'] = TOKEN['quoteMint']
        value['meta']['generatedAt'] = (actual-dt.timedelta(hours=4)).isoformat()
        with self.assertRaises(collector.CollectionError):collector.fetch(TOKEN, opener, lambda: actual)

    def test_outages_and_partial_failure_never_turn_accepted_dispatch_into_fake_data_success(self):
        first = self.reserve()
        self.ledger.record_outcome(SLOT, first.claim, 'accepted', NOW)
        summary, store = {}, {}
        def unavailable(_):raise TimeoutError('private fixture')
        collector.collect([TOKEN], store, unavailable, lambda _: None, summary)
        self.assertEqual(summary['overall'], 'failed');self.assertEqual(store, {})
        self.assertEqual(self.ledger.receipt(SLOT)['state'], 'accepted')
        self.assertNotIn('persisted', self.ledger.export_receipt(SLOT))
        self.assertEqual(self.reserve().action, 'duplicate_suppressed')
        tokens = json.loads((ROOT / 'data/tracked-mints.json').read_text())[:2]
        def partial(token):
            if token['mint'] == tokens[1]['mint']:
                raise collector.CollectionError('provider_rate_limited')
            return {'observedAt': NOW.isoformat(), 'distributedTokens': 1,
                    'quoteMint': token['quoteMint'], 'quoteSymbol': token['quoteSymbol'], 'source': token['source']}
        collector.collect(tokens, store, partial, lambda _: None, summary)
        self.assertEqual(summary['overall'], 'partial')
        self.assertNotIn(tokens[1]['mint'], store)
        self.assertEqual(self.ledger.receipt(SLOT)['state'], 'accepted')

    def test_publication_conflict_hash_and_protected_controls_fail_closed(self):
        payload = b'{"explicit_synthetic_fixture": []}\n'
        revision = 'sha256:'+hashlib.sha256(payload).hexdigest()
        def check(main='a'*40, rev=revision, controls=(b'allowlist', b'allowlist', b'archive-manifest', b'archive-manifest')):
            return contract.publication_preflight('a'*40, main, payload, rev, *controls)
        self.assertEqual(check(), 'candidate_consistent_not_publication_proof')
        self.assertEqual(check(main='b'*40), 'stop_main_advanced_preserve_artifacts')
        self.assertEqual(check(main='unknown'), 'stop_invalid_git_evidence')
        self.assertEqual(check(rev='sha256:'+'0'*64), 'stop_candidate_hash_mismatch')
        self.assertEqual(check(controls=(b'allowlist', b'changed', b'archive', b'archive')), 'stop_protected_input_changed')
        self.assertEqual(check(controls=(b'allowlist', b'allowlist', b'archive', b'changed')), 'stop_protected_input_changed')
        self.assertEqual(check(controls=(None, None, None, None)), 'stop_invalid_protected_evidence')
        self.assertEqual(payload, b'{"explicit_synthetic_fixture": []}\n')


if __name__ == '__main__':unittest.main()
