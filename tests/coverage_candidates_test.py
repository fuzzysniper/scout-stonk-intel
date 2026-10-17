"""Offline fixtures only. Mutated clocks/counters below are synthetic, never app data."""
import ast
import copy
import datetime as dt
import hashlib
import json
import pathlib
import subprocess
import sys
import unittest
from unittest.mock import patch

from scripts import coverage_candidates as c
from scripts import coverage_candidate_report as cli

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG_BYTES = (ROOT / 'research/reward-candidates.json').read_bytes()
EVIDENCE_BYTES = (ROOT / 'docs/evidence/pair-reward-audit-2026-10-14.json').read_bytes()
CATALOG, PACKETS, AS_OF = cli.retained_inputs(CATALOG_BYTES, EVIDENCE_BYTES)
SELECTED = [row['mint'] for row in CATALOG['candidates']]
EMPTY = {'version': 1, 'kind': 'candidate_quote_ledger_v1', 'tokens': {}}


def evaluate(catalog=None, packets=None, selected=None, as_of=AS_OF, **kwargs):
    if selected is not None and packets is not None:
        allowed = c.plan(catalog or CATALOG, selected, opt_in=True, request_budget=21)['requests']
        packets = [p for p in packets if p['source'] in allowed]
    return c.evaluate(catalog or CATALOG, SELECTED if selected is None else selected,
                      PACKETS if packets is None else packets, as_of,
                      opt_in=True, request_budget=21, **kwargs)


def change(packets, source, mutate):
    packet = next(p for p in packets if p['source'] == source)
    data = json.loads(packet['body'])
    mutate(data)
    packet['body'] = json.dumps(data, ensure_ascii=False).encode()
    return packet


def rehash(record):
    record['id'] = c.sha(c.canonical({k: v for k, v in record.items() if k != 'id'}))
    return record


def next_record(record, seconds=60, **changes):
    out = copy.deepcopy(record)
    for k in ('observedAt', 'providerGeneratedAt'):
        out[k] = (c.time(out[k]) + dt.timedelta(seconds=seconds)).isoformat()
    for source in out['identitySources']:
        for k in ('capturedAt', 'providerGeneratedAt'):
            source[k] = (c.time(source[k]) + dt.timedelta(seconds=seconds)).isoformat()
    out.update(changes)
    out['receiptRevision'] = c.sha(c.canonical(out))
    return rehash(out)


def summary(store, record):
    raw = c.canonical(store)
    return raw, c.canonical({'version': 1, 'startedAt': record['observedAt'],
                            'finishedAt': record['observedAt'], 'expectedDatasetRevision': c.sha(raw),
                            'accepted': [{k: record[k] for k in ('mint', 'id', 'observedAt', 'providerGeneratedAt', 'receiptRevision')}]})


class CoverageCandidateTests(unittest.TestCase):
    def setUp(self):
        self.socket = patch('socket.create_connection', side_effect=AssertionError('no real network in candidate tests'))
        self.socket.start()
        self.addCleanup(self.socket.stop)

    def test_recorded_catalog_has_16_verified_identities_14_new_and_no_active_allowlist_change(self):
        result = evaluate()
        self.assertEqual(result['state'], 'validated_offline')
        self.assertEqual(result['requestsMade'], 0)
        self.assertEqual(result['plannedRequests'], 21)
        self.assertEqual(len(result['rows']), 16)
        active = json.loads((ROOT / 'data/tracked-mints.json').read_bytes())
        self.assertEqual(len(active), 7)
        self.assertEqual(len(set(SELECTED) - {row['mint'] for row in active}), 14)
        named = {row['symbol']: row for row in CATALOG['candidates']}
        for symbol, quote, decimals in [('SI', 'NVDAX', 8), ('GP', 'GLDX', 8), ('GROK', 'SPCXX', 8), ('KNOTS', 'STONK', 9)]:
            self.assertEqual(named[symbol]['quoteSymbol'], quote)
            self.assertEqual(named[symbol]['quoteDecimals'], decimals)
        for row in result['rows']:
            c.checked_record(row['observation'])
            packet = next(p for p in PACKETS if p['source'] == row['observation']['source'])
            self.assertEqual(row['observation']['observedAt'], packet['capturedAt'])
            self.assertEqual(row['observation']['receiptRevision'], c.sha(packet['body']))
            self.assertEqual(row['observation']['identitySources'][0]['source'], c.REGISTRY)
            self.assertEqual(row['observation']['identitySources'][1]['source'], c.CATALOG+row['observation']['quoteMint'])
        self.assertFalse(result['executable'])
        self.assertIsNone(result['ranking'])
        self.assertIsNone(result['recentFlow'])
        self.assertIsNone(result['holderReturn'])

    def test_default_inactive_touches_no_input_and_opt_in_never_grants_execution_or_rights(self):
        class Trap:
            def __iter__(self):
                raise AssertionError('inactive must not inspect input')
        result = c.evaluate(Trap(), Trap(), Trap(), 'not-a-time')
        self.assertEqual(result['state'], 'inactive')
        self.assertEqual(result['plannedRequests'], 0)
        self.assertEqual(c.append_offline(Trap(), Trap())[1], 'inactive')
        for enabled in [None, False, 'true', 1]:
            self.assertEqual(c.plan(None, None, opt_in=enabled)['state'], 'inactive')
        proposed = c.plan(CATALOG, SELECTED, opt_in=True, request_budget=21)
        self.assertFalse(proposed['executable'])
        for rights in [{**c.RIGHTS, 'financialPublication': 'allowed'}, {**c.RIGHTS, 'retention': 'allowed'}]:
            catalog = copy.deepcopy(CATALOG);catalog['rights'] = rights
            with self.assertRaises(c.Rejected):
                evaluate(catalog)

    def test_exact_mints_duplicate_tickers_and_quote_ambiguity_are_independent(self):
        catalog, packets = copy.deepcopy(CATALOG), copy.deepcopy(PACKETS)
        first, second = [r for r in catalog['candidates'] if r['quoteSymbol'] == 'GLDX'][:2]
        second['symbol'] = first['symbol']
        change(packets, c.CATALOG + first['quoteMint'], lambda d: next(t for t in d['data']['tokens'] if t['mint'] == second['mint']).update(symbol=first['symbol']))
        result = evaluate(catalog, packets, [first['mint'], second['mint']])
        self.assertEqual(result['state'], 'validated_offline')
        self.assertEqual(len({r['mint'] for r in result['rows']}), 2)
        stonk = next(r for r in catalog['candidates'] if r['symbol'] == 'KNOTS')
        packets = copy.deepcopy(PACKETS)
        registry = json.loads(packets[0]['body'])['data']['pairs']
        other = next(q for q in registry if q['symbol'] == 'STONK' and q['mint'] != stonk['quoteMint'])
        change(packets, c.REWARDS + stonk['mint'] + '/rewards', lambda d: d['quote'].update(mint=other['mint']))
        row = next(r for r in evaluate(packets=packets)['rows'] if r['mint'] == stonk['mint'])
        self.assertEqual(row['reason'], 'quote_units_mismatch')
        for selected in [['GP'], [first['mint'], first['mint']], [first['mint'].lower()], [' '+first['mint']]]:
            with self.assertRaises(c.Rejected):
                evaluate(selected=selected)

    def test_sample_counts_never_imply_exhaustiveness_or_rewards_ranking(self):
        result = evaluate()
        self.assertEqual(len(result['coverage']), 4)
        self.assertEqual(sum(q['catalogEntriesInspected'] for q in result['coverage'].values()), 100)
        self.assertEqual(sum(q['providerReportedAllModePools'] for q in result['coverage'].values()), 28847)
        for q in result['coverage'].values():
            self.assertFalse(q['complete']);self.assertFalse(q['atomic'])
            self.assertGreater(q['uninspectedAllModePools'], 0)
        packets = copy.deepcopy(PACKETS)
        source = next(p['source'] for p in packets if p['source'].startswith(c.CATALOG))
        change(packets, source, lambda d: d['data']['tokens'][0]['quote'].update(mint=SELECTED[0]))
        self.assertTrue(any(r['reason'] == 'provider_filter_mismatch' for r in evaluate(packets=packets)['rows']))
        packets = copy.deepcopy(PACKETS)
        change(packets, source, lambda d: d['data']['tokens'].pop())
        self.assertTrue(any(r['reason'] == 'invalid_pagination' for r in evaluate(packets=packets)['rows']))
        candidate = CATALOG['candidates'][0]
        packets = copy.deepcopy(PACKETS)
        other = next(r['mint'] for r in json.loads((ROOT / 'data/tracked-mints.json').read_bytes()) if r['mint'] not in SELECTED)
        change(packets, c.CATALOG+candidate['quoteMint'], lambda d: next(t for t in d['data']['tokens'] if t['mint'] == candidate['mint']).update(mint=other))
        missing = next(r for r in evaluate(packets=packets)['rows'] if r['mint'] == candidate['mint'])
        self.assertEqual(missing['reason'], 'not_in_bounded_catalog_sample')
        self.assertIsNone(missing['observation'])

    def test_registry_units_identity_ambiguity_and_partial_responses_fail_closed(self):
        mutations = [lambda d: d['data'].update(selectBy='symbol'), lambda d: d.update(pagination={'next': 2}),
                     lambda d: d['data'].update(partial=True), lambda d: d['data'].update(ambiguousSymbolCount=0),
                     lambda d: d['data']['pairs'].append(d['data']['pairs'][0]), lambda d: d['data']['pairs'][0].update(decimals=True),
                     lambda d: d['data']['pairs'][0].update(tokenProgram='unverified')]
        for mutate in mutations:
            packets = copy.deepcopy(PACKETS);change(packets, c.REGISTRY, mutate)
            result = evaluate(packets=packets)
            self.assertEqual(result['state'], 'withheld')
            self.assertTrue(all(r['observation'] is None for r in result['rows']))
        row = CATALOG['candidates'][0]
        for field, value in [('decimals', 7), ('symbol', 'WRONG')]:
            packets = copy.deepcopy(PACKETS)
            change(packets, c.REGISTRY, lambda d: next(q for q in d['data']['pairs'] if q['mint'] == row['quoteMint']).update({field: value}))
            result = evaluate(packets=packets)
            self.assertIsNone(next(r for r in result['rows'] if r['mint'] == row['mint'])['observation'])

    def test_ledger_raw_precision_genuine_zero_missing_and_populations(self):
        result = evaluate()
        knots = next(r['observation'] for r in result['rows'] if r['observation']['quoteSymbol'] == 'STONK' and r['observation']['mint'] == next(ca['mint'] for ca in CATALOG['candidates'] if ca['symbol'] == 'KNOTS'))
        self.assertEqual(knots['distributedTokensExact'], '11995464.083712182')
        zero = next(r['observation'] for r in result['rows'] if r['observation']['distributedRaw'] == '0')
        self.assertEqual(zero['distributedTokensExact'], '0.00000000')
        row = CATALOG['candidates'][0];source = c.REWARDS + row['mint'] + '/rewards'
        packets = copy.deepcopy(PACKETS);change(packets, source, lambda d: d.update(rewards=None))
        failed = next(r for r in evaluate(packets=packets)['rows'] if r['mint'] == row['mint'])
        self.assertEqual(failed['mechanism'], 'settings_verified')
        self.assertEqual(failed['reason'], 'lifetime_unavailable');self.assertIsNone(failed['observation'])
        for mutate in [lambda d: d.update(basis='snapshot'), lambda d: d['rewards'].update(distributedRaw='01'),
                       lambda d: d['rewards'].update(distributedRaw='1'*79), lambda d: d['rewards'].update(distributedRaw=1),
                       lambda d: d['rewards'].update(payoutCount=True), lambda d: d['rewards'].update(walletsPaid=c.SAFE+1),
                       lambda d: d['rewards'].update(lastPayoutAt='2099-01-01T00:00:00Z'), lambda d: d['quote'].update(decimals=7),
                       lambda d: d.update(mode='standard'), lambda d: d.update(mint=SELECTED[-1])]:
            packets = copy.deepcopy(PACKETS);change(packets, source, mutate)
            self.assertIsNone(next(r for r in evaluate(packets=packets)['rows'] if r['mint'] == row['mint'])['observation'])
        gp = next(r['observation'] for r in result['rows'] if r['observation']['mint'] == next(x['mint'] for x in CATALOG['candidates'] if x['symbol'] == 'GP'))
        self.assertNotIn('base', gp);self.assertNotIn('holderCount', gp)

    def test_provider_generated_time_transport_age_and_current_staleness_are_not_retimed(self):
        later = '2026-10-16T20:15:14Z'
        stale = evaluate(as_of=later)
        self.assertTrue(all(r['observation'] is None for r in stale['rows']))
        source = c.REWARDS + SELECTED[0] + '/rewards'
        for generated in [None, '', '2026-02-30T22:34:00Z', '2026-10-14T22:40:00Z', '2026-10-14T20:00:00Z']:
            packets = copy.deepcopy(PACKETS);change(packets, source, lambda d: d.update(generatedAt=generated))
            self.assertIsNone(next(r for r in evaluate(packets=packets)['rows'] if r['mint'] == SELECTED[0])['observation'])
        for age in ['301', '-1', '1.5', 0, 'private-sentinel']:
            packets = copy.deepcopy(PACKETS);packets[0]['headers']['age'] = age
            result = evaluate(packets=packets)
            self.assertEqual(result['state'], 'withheld')
            self.assertNotIn('private-sentinel', json.dumps(result))
        packets = copy.deepcopy(PACKETS);change(packets, c.REGISTRY, lambda d: d.update(meta=None))
        self.assertEqual(evaluate(packets=packets)['state'], 'withheld')

    def test_rate_outage_timeout_redirect_missing_and_invalid_json_never_zero_or_retry(self):
        for status, delay, expected in [(429, '120', 120), (429, None, None), (429, 'Wed, 21 Oct 2026', None), (429, '99999', None), (503, '90', 90)]:
            packets = copy.deepcopy(PACKETS);packets[-1].update(status=status, body=b'private-sentinel')
            packets[-1]['headers']['retry-after'] = delay
            result = evaluate(packets=packets)
            self.assertEqual(result['pause']['retryAfterSeconds'], expected)
            self.assertFalse(result['pause']['retry'])
            self.assertTrue(all(r['observation'] is None for r in result['rows']))
            self.assertNotIn('private-sentinel', json.dumps(result))
        for status in [None, 301, 401, 403, 404, 500]:
            packets = copy.deepcopy(PACKETS);packets[0].update(status=status)
            self.assertEqual(evaluate(packets=packets)['state'], 'withheld')
        for body in [b'{', b'[]', b'{"x":NaN}', b'{"x":1,"x":2}', b'\xff']:
            packets = copy.deepcopy(PACKETS);packets[0]['body'] = body
            self.assertEqual(evaluate(packets=packets)['state'], 'withheld')
        for header in [{'content-range': 'bytes 0-1/999'}, {'link': '<next>; rel=next'}, {'content-type': 'text/html'}, {'location': 'https://untrusted.invalid'}]:
            packets = copy.deepcopy(PACKETS);packets[0]['headers'].update(header)
            self.assertEqual(evaluate(packets=packets)['state'], 'withheld')
        self.assertTrue(all(r['observation'] is None for r in evaluate(packets=[])['rows']))

    def test_hard_candidate_request_body_and_selection_budgets(self):
        canary = [row['mint'] for row in CATALOG['candidates'] if row['symbol'] in ('GP', 'GROK')]
        controls = [row['mint'] for row in CATALOG['candidates'] if row['symbol'] in ('SI', 'KNOTS')]
        self.assertEqual(len(c.plan(CATALOG, canary, opt_in=True, request_budget=5)['requests']), 5)
        self.assertEqual(len(c.plan(CATALOG, canary+controls, opt_in=True, request_budget=9)['requests']), 9)
        for budget in [0, 20, 22, True, 1.5, '21']:
            with self.assertRaises(c.Rejected):
                c.plan(CATALOG, SELECTED, opt_in=True, request_budget=budget)
        for source, cap in [(c.REGISTRY, c.POLICY['registryBytes']), (c.CATALOG+CATALOG['candidates'][0]['quoteMint'], c.POLICY['catalogBytes']), (c.REWARDS+SELECTED[0]+'/rewards', c.POLICY['rewardBytes'])]:
            packets = copy.deepcopy(PACKETS);next(p for p in packets if p['source'] == source)['body'] = b'x'*(cap+1)
            with self.assertRaises(c.Rejected):
                evaluate(packets=packets)
        for packets in [PACKETS+[PACKETS[0]], [PACKETS[0], PACKETS[0]], [{**PACKETS[0], 'source': 'https://untrusted.invalid'}]]:
            with self.assertRaises(c.Rejected):
                evaluate(packets=packets)
        catalog = copy.deepcopy(CATALOG);catalog['candidates'].append(catalog['candidates'][0])
        with self.assertRaises(c.Rejected):
            evaluate(catalog)

    def test_duplicate_snapshot_and_conflict_preserve_immutable_originals(self):
        record = evaluate()['rows'][0]['observation']
        store, status = c.append_offline(EMPTY, record, opt_in=True)
        self.assertEqual(status, 'appended_offline');self.assertEqual(EMPTY['tokens'], {})
        before = c.canonical(store)
        same, status = c.append_offline(store, record, opt_in=True)
        self.assertEqual(status, 'duplicate');self.assertIs(same, store)
        duplicate = next_record(record);duplicate['providerGeneratedAt'] = record['providerGeneratedAt'];duplicate['receiptRevision'] = record['receiptRevision'];rehash(duplicate)
        self.assertEqual(c.append_offline(store, duplicate, opt_in=True)[1], 'duplicate_provider_snapshot')
        conflict = copy.deepcopy(record);conflict['receiptRevision'] = c.sha(b'conflict');rehash(conflict)
        with self.assertRaisesRegex(c.Rejected, 'conflicting_observation'):
            c.append_offline(store, conflict, opt_in=True)
        conflict = next_record(record);conflict['providerGeneratedAt'] = record['providerGeneratedAt'];rehash(conflict)
        with self.assertRaisesRegex(c.Rejected, 'conflicting_provider_snapshot'):
            c.append_offline(store, conflict, opt_in=True)
        conflict['receiptRevision'] = record['receiptRevision'];conflict['payoutCount'] += 1;rehash(conflict)
        with self.assertRaisesRegex(c.Rejected, 'conflicting_provider_snapshot'):
            c.append_offline(store, conflict, opt_in=True)
        self.assertEqual(c.canonical(store), before)

    def test_quote_mode_epoch_counter_reset_and_clock_regression_are_quarantined(self):
        record = evaluate()['rows'][0]['observation'];store, _ = c.append_offline(EMPTY, record, opt_in=True)
        before = c.canonical(store)
        for fields in [{'quoteMint': CATALOG['candidates'][-1]['quoteMint']}, {'quoteDecimals': 7}, {'mode': 'standard'},
                       {'distributedRaw': '0', 'distributedTokensExact': '0.'+'0'*record['quoteDecimals']},
                       {'payoutCount': 1, 'walletsPaid': 1}, {'providerGeneratedAt': record['providerGeneratedAt']}]:
            point = next_record(record, **fields)
            with self.assertRaises(c.Rejected):
                c.append_offline(store, point, opt_in=True)
            self.assertEqual(c.canonical(store), before)
        with self.assertRaises(c.Rejected):
            c.append_offline(store, next_record(record, seconds=-60), opt_in=True)

    def test_retention_hard_stop_never_drops_old_points_or_adds_unbounded_tokens(self):
        record = evaluate()['rows'][0]['observation']
        points = [next_record(record, seconds=60*i) for i in range(c.POLICY['pointsPerToken'])]
        store = {'version': 1, 'kind': EMPTY['kind'], 'tokens': {record['mint']: points}}
        c.validate_store(store);before = c.canonical(store)
        with self.assertRaisesRegex(c.Rejected, 'retention_capacity'):
            c.append_offline(store, next_record(points[-1]), opt_in=True)
        self.assertEqual(c.canonical(store), before)
        invalid = copy.deepcopy(store);invalid['tokens'][SELECTED[-1]] = []
        with self.assertRaises(c.Rejected):
            c.validate_store(invalid)
        full = copy.deepcopy(EMPTY)
        for address in SELECTED:
            point = copy.deepcopy(record);point.update(mint=address, source=c.REWARDS+address+'/rewards');rehash(point)
            full['tokens'][address] = [point]
        c.validate_store(full)
        active = json.loads((ROOT / 'data/tracked-mints.json').read_bytes())
        address = next(r['mint'] for r in active if r['mint'] not in SELECTED)
        point = copy.deepcopy(record);point.update(mint=address, source=c.REWARDS+address+'/rewards');rehash(point)
        with self.assertRaisesRegex(c.Rejected, 'retention_capacity'):
            c.append_offline(full, point, opt_in=True)

    def test_persistence_hash_and_latest_observation_match_independently(self):
        record = evaluate()['rows'][0]['observation'];store, _ = c.append_offline(EMPTY, record, opt_in=True)
        dataset, receipt = summary(store, record)
        self.assertEqual(c.match_persistence(dataset, receipt), {'datasetHashMatched': True, 'observationsMatched': 1, 'servedRevisionVerified': False})
        with self.assertRaises(c.Rejected):
            c.match_persistence(dataset+b' ', receipt)
        for key, value in [('providerGeneratedAt', '2026-10-14T22:34:00Z'), ('receiptRevision', c.sha(b'wrong')), ('mint', SELECTED[-1])]:
            changed = json.loads(receipt);changed['accepted'][0][key] = value
            with self.assertRaises(c.Rejected):
                c.match_persistence(dataset, c.canonical(changed))
        changed = json.loads(receipt);changed['startedAt'] = '2026-10-15T22:34:00Z';changed['finishedAt'] = changed['startedAt']
        with self.assertRaises(c.Rejected):
            c.match_persistence(dataset, c.canonical(changed))
        updated, _ = c.append_offline(store, next_record(record), opt_in=True)
        changed = json.loads(receipt);changed['expectedDatasetRevision'] = c.sha(c.canonical(updated))
        with self.assertRaises(c.Rejected):
            c.match_persistence(c.canonical(updated), c.canonical(changed))
        bad = copy.deepcopy(record);bad['identitySources'][0]['source'] = 'https://untrusted.invalid';rehash(bad)
        with self.assertRaises(c.Rejected):
            c.append_offline(EMPTY, bad, opt_in=True)

    def test_document_pin_and_per_candidate_receipt_references_cannot_be_substituted(self):
        with self.assertRaises(c.Rejected):
            cli.retained_inputs(CATALOG_BYTES, EVIDENCE_BYTES+b' ')
        changed = copy.deepcopy(CATALOG);changed['candidates'][0]['evidence']['rewardsPacket'] = 20
        with self.assertRaises(c.Rejected):
            cli.retained_inputs(c.canonical(changed), EVIDENCE_BYTES)
        changed = copy.deepcopy(CATALOG);changed['sourceEvidence']['asOf'] = '2026-10-16T20:15:14Z'
        with self.assertRaises(c.Rejected):
            cli.retained_inputs(c.canonical(changed), EVIDENCE_BYTES)

    def test_metadata_only_report_no_automatic_network_cli_options_or_active_imports(self):
        report = cli.report(CATALOG_BYTES, EVIDENCE_BYTES, '2026-10-16T20:15:14Z')
        self.assertEqual(len(report['candidates']), 16)
        for row in report['candidates']:
            self.assertEqual(row['temporalState'], 'historical_not_current')
            self.assertIsNone(row['lifetime']);self.assertIsNone(row['recentFlow']);self.assertIsNone(row['holderReturn'])
            self.assertEqual(row['financialPublication'], 'withheld')
        encoded = json.dumps(report)
        self.assertNotIn('distributedRaw', encoded);self.assertNotIn('distributedTokensExact', encoded)
        for path in ['scripts/coverage_candidates.py', 'scripts/coverage_candidate_report.py']:
            tree = ast.parse((ROOT/path).read_text())
            imports = [n.module for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)] + [a.name for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names]
            self.assertFalse(any(n and n.split('.')[0] in ('urllib', 'requests', 'socket', 'subprocess', 'http') for n in imports))
        for path in ['scripts/collect_rewards.py', '.github/workflows/reward-snapshots.yml']:
            self.assertNotIn('coverage_candidates', (ROOT/path).read_text())
        for args, status in [(['--offline-report'], 0), ([], 1), (['--activate'], 1), (['--offline-report', '--url', 'https://untrusted.invalid'], 1)]:
            result = subprocess.run([sys.executable, '-m', 'scripts.coverage_candidate_report', *args], cwd=ROOT, capture_output=True, text=True, timeout=5)
            self.assertEqual(result.returncode, status);self.assertEqual(result.stderr, '')
            self.assertEqual(json.loads(result.stdout)['requestsMade'], 0)


if __name__ == '__main__':
    unittest.main()
