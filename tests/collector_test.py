"""Synthetic collector responses only; never modify checked-in observations."""
import copy
import datetime as dt
import importlib.util
import io
import json
import pathlib
import unittest
import urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('collector', ROOT / 'scripts/collect_rewards.py')
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)
TOKEN = json.loads((ROOT / 'data/tracked-mints.json').read_text())[0]
OTHER = json.loads((ROOT / 'data/tracked-mints.json').read_text())[1]
NOW = dt.datetime(2026, 10, 12, 21, tzinfo=dt.timezone.utc)


def fixture(token=TOKEN, total=1):
    return {'data': {'mint': token['mint'], 'mode': 'reward', 'quote': {'mint': token['quoteMint'], 'symbol': token['quoteSymbol']},
                     'rewards': {'distributedTokens': total, 'payoutCount': 2, 'holderCount': 1}},
            'meta': {'generatedAt': NOW.isoformat()}}


class Response(io.BytesIO):
    def geturl(self):
        return TOKEN['source']


def read_fixture(value):
    def opener(request, timeout):
        assert request.full_url == TOKEN['source']
        assert timeout == 8
        return Response(json.dumps(value).encode())
    return collector.fetch(TOKEN, opener, lambda: NOW)


class CollectorTests(unittest.TestCase):
    def test_real_allowlist_matches_official_captured_evidence(self):
        tokens = collector.load_mints(json.loads((ROOT / 'data/tracked-mints.json').read_text()))
        self.assertTrue(5 <= len(tokens) <= 10)
        evidence = json.loads((ROOT / 'public/evidence/reward-verification.json').read_text())
        catalog = {t['mint']: t for t in evidence['catalog']['response']['data']['tokens']}
        ledgers = {r['response']['data']['mint']: r for r in evidence['rewards']}
        for token in tokens:
            ledger = ledgers[token['mint']]['response']['data']
            self.assertEqual(catalog[token['mint']]['mode'], 'reward')
            self.assertEqual(ledger['mode'], 'reward')
            self.assertEqual(ledger['quote']['mint'], token['quoteMint'])
            self.assertEqual(ledger['quote']['symbol'], token['quoteSymbol'])
            self.assertGreater(ledger['rewards']['payoutCount'], 0)
            observed = collector.timestamp(token['verifiedAt'])
            last = collector.timestamp(ledger['rewards']['lastPayoutAt'])
            self.assertTrue(0 <= (observed-last).total_seconds() <= 86400)

    def test_valid_record_has_actual_observation_and_explicit_identity(self):
        record = read_fixture(fixture())
        self.assertEqual(record['observedAt'], NOW.isoformat(timespec='seconds'))
        self.assertEqual(record['quoteMint'], TOKEN['quoteMint'])
        self.assertEqual(record['providerGeneratedAt'], NOW.isoformat())
        self.assertEqual(record['source'], TOKEN['source'])

    def test_bad_mode_identity_quote_counter_and_provider_times_are_rejected(self):
        cases = [None, [], {}]
        for field, value in [('mint', OTHER['mint']), ('mode', 'standard'), ('quote', {'mint': OTHER['quoteMint'], 'symbol': 'BAD'}), ('rewards', None)]:
            raw = fixture(); raw['data'][field] = value; cases.append(raw)
        for amount in [None, True, -1, float('nan'), float('inf'), '100']:
            raw = fixture(total=amount); cases.append(raw)
        for generated in [None, 'bad', '2026-10-12T17:00:00Z', '2026-10-13T21:00:00Z']:
            raw = fixture();raw['meta']['generatedAt'] = generated;cases.append(raw)
        for raw in cases:
            with self.subTest(raw=raw), self.assertRaises((ValueError, TypeError)):
                read_fixture(raw)

    def test_404_429_and_timeout_are_isolated_and_never_add_missing_points(self):
        for error in [urllib.error.HTTPError(TOKEN['source'], 404, 'missing', {}, None),
                      urllib.error.HTTPError(TOKEN['source'], 429, 'limited', {}, None), TimeoutError('private detail')]:
            store = {};logs = []
            def fetcher(token):
                if token['mint'] == TOKEN['mint']:
                    raise error
                return {'observedAt': NOW.isoformat(), 'distributedTokens': 1}
            count = collector.collect([TOKEN, OTHER], store, fetcher, logs.append)
            self.assertEqual(count, 1)
            self.assertNotIn(TOKEN['mint'], store)
            self.assertEqual(len(store[OTHER['mint']]), 1)
            self.assertTrue(any('collection failed' in line for line in logs))
            self.assertFalse(any('private detail' in line for line in logs))

    def test_duplicate_conflicts_preserve_existing_and_resets_are_recorded(self):
        first = {'observedAt': NOW.isoformat(), 'distributedTokens': 10, 'payoutCount': 10}
        history = [first];logs = []
        self.assertFalse(collector.append_observation(history, {**first, 'distributedTokens': 99}, logs.append))
        self.assertEqual(history[0]['distributedTokens'], 10)
        later = {'observedAt': (NOW+dt.timedelta(hours=1)).isoformat(), 'distributedTokens': 1, 'payoutCount': 1}
        self.assertTrue(collector.append_observation(history, later, logs.append))
        self.assertEqual([row['distributedTokens'] for row in history], [10, 1])
        self.assertTrue(any('reset' in line for line in logs))
        with self.assertRaises(ValueError):
            collector.append_observation(history, {**later, 'observedAt': (NOW-dt.timedelta(hours=1)).isoformat()})

    def test_limit_validation_and_retention(self):
        for value in [[], [TOKEN]*11, [TOKEN,TOKEN], [{**TOKEN, 'mint':'../path'}], [{**TOKEN, 'quoteMint':'invalid'}], [{**TOKEN, 'source':'https://evil.example'}]]:
            with self.assertRaises(ValueError):collector.load_mints(value)
        history = [{'observedAt': (NOW-dt.timedelta(hours=i)).isoformat(), 'distributedTokens': 0} for i in range(collector.MAX_POINTS,0,-1)]
        collector.append_observation(history, {'observedAt': NOW.isoformat(), 'distributedTokens': 1})
        self.assertEqual(len(history), collector.MAX_POINTS)

    def test_oversize_redirect_and_malformed_responses(self):
        for payload in [b'{broken', b' '*(collector.MAX_BYTES+1)]:
            with self.assertRaises(ValueError):collector.fetch(TOKEN, lambda req,timeout: Response(payload), lambda:NOW)
        class Redirect(Response):
            def geturl(self):return 'https://evil.example'
        with self.assertRaises(ValueError):collector.fetch(TOKEN, lambda req,timeout:Redirect(b'{}'), lambda:NOW)


if __name__ == '__main__':
    unittest.main()
