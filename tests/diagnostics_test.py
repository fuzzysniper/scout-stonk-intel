"""Synthetic operational diagnostics only; never dispatch workflows or mutate production data."""
import datetime as dt
import importlib.util
import json
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import audit_collector as audit
import collect_rewards as collector
TOKENS = json.loads((ROOT / 'data/tracked-mints.json').read_text())
NOW = dt.datetime(2026, 10, 12, 23, 33, tzinfo=dt.timezone.utc)


def record(token, hours=0):
    return {'observedAt': (NOW+dt.timedelta(hours=hours)).isoformat(), 'distributedTokens': 1,
            'quoteMint': token['quoteMint'], 'quoteSymbol': token['quoteSymbol'], 'source': token['source']}


class DiagnosticsTests(unittest.TestCase):
    def test_partial_failure_summary_is_explicit_and_sanitized(self):
        summary = {};logs = [];store = {}
        def fetcher(token):
            if token['mint'] == TOKENS[1]['mint']:
                raise collector.CollectionError('provider_rate_limited')
            return record(token)
        self.assertEqual(collector.collect(TOKENS[:2], store, fetcher, logs.append, summary), 1)
        self.assertEqual(summary['overall'], 'partial')
        self.assertEqual([row['status'] for row in summary['results']], ['collected', 'failed'])
        self.assertEqual(summary['results'][1]['reason'], 'provider_rate_limited')
        self.assertNotIn(TOKENS[1]['mint'], store)

    def test_all_failure_duplicate_and_recovery_have_distinct_outcomes(self):
        store = {};summary = {}
        def fail(token):raise TimeoutError('private test-fixture text')
        self.assertEqual(collector.collect(TOKENS[:1], store, fail, lambda _:None, summary), 0)
        self.assertEqual(summary['overall'], 'failed');self.assertEqual(summary['results'][0]['reason'], 'network_timeout')
        self.assertNotIn('private test-fixture', json.dumps(summary))
        collector.collect(TOKENS[:1], store, record, lambda _:None, summary)
        self.assertEqual(summary['overall'], 'complete')
        collector.collect(TOKENS[:1], store, record, lambda _:None, summary)
        self.assertEqual(summary['overall'], 'skipped');self.assertEqual(summary['results'][0]['reason'], 'duplicate_timestamp')
        self.assertEqual(len(store[TOKENS[0]['mint']]), 1)

    def test_conservative_alert_thresholds_no_price_or_reward_amount_ranking(self):
        healthy = {token['mint']: [record(token)] for token in TOKENS}
        self.assertFalse(audit.data_failure(healthy, TOKENS, NOW))
        for token in TOKENS:
            healthy[token['mint']][0]['distributedTokens'] = 0
        self.assertFalse(audit.data_failure(healthy, TOKENS, NOW))
        healthy[TOKENS[0]['mint']] = [record(TOKENS[0], -6)]
        self.assertFalse(audit.data_failure(healthy, TOKENS, NOW))
        healthy[TOKENS[0]['mint']] = [record(TOKENS[0], -6.01)]
        self.assertTrue(audit.data_failure(healthy, TOKENS, NOW))
        self.assertTrue(audit.data_failure({}, TOKENS, NOW+dt.timedelta(hours=7)))
        self.assertTrue(audit.data_failure([], TOKENS, NOW))
        healthy[TOKENS[0]['mint']] = [record(TOKENS[0])]
        self.assertFalse(audit.data_failure(healthy, TOKENS, NOW))

    def test_green_job_alone_is_not_a_successful_data_commit(self):
        runs = [{'id':1,'head_branch':'main','path':'.github/workflows/reward-snapshots.yml','event':'workflow_dispatch','status':'completed','conclusion':'success','created_at':NOW.isoformat(),'updated_at':NOW.isoformat(), 'secret':'test-fixture-private'}]
        clean = audit.summarize_runs(runs, {'jobs':[{'steps':[{'name':'Collect observations','conclusion':'success'},{'name':'Persist observations and summary','conclusion':'failure'}]}]})
        self.assertEqual(clean[0]['conclusion'], 'success')
        self.assertEqual(clean[0]['commitStep'], 'failure')
        self.assertNotIn('confirmedCommit', clean[0]);self.assertNotIn('secret', clean[0])
        self.assertEqual(audit.summarize_runs([{**runs[0], 'head_branch':'feature'}]), [])

    def test_bounded_audit_checks_schedule_jobs_and_exact_dataset_revision(self):
        calls = []
        run = {'id':1,'head_branch':'main','path':'.github/workflows/reward-snapshots.yml','event':'schedule','status':'completed','conclusion':'success','created_at':NOW.isoformat(),'updated_at':NOW.isoformat()}
        def get(url, token=None, limit=None):
            calls.append(url)
            if url.endswith('/reward-snapshots.yml'):value={'state':'active','created_at':(NOW-dt.timedelta(hours=24)).isoformat()}
            elif 'event=schedule' in url:value={'total_count':1}
            elif '/runs?branch=' in url:value={'workflow_runs':[run],'total_count':1}
            elif '/jobs?' in url:value={'jobs':[{'steps':[{'name':'Collect observations','conclusion':'success'},{'name':'Persist observations and summary','conclusion':'success'}]}]}
            elif '/commits?' in url:value=[{'sha':'a'*40,'commit':{'committer':{'date':NOW.isoformat()}}}]
            else:value={TOKENS[0]['mint']:[record(TOKENS[0])]}
            return json.dumps(value).encode()
        result=audit.audit(get,NOW,'test-fixture-token')
        self.assertEqual(result['state'],'checked');self.assertEqual(result['scheduledRunCount'],1)
        self.assertEqual(result['cadence']['state'],'checked');self.assertEqual(result['cadence']['nominalSlots'],24)
        self.assertTrue(any('per_page=48' in url for url in calls))
        self.assertTrue(result['latestDatasetCommit']['revision'].startswith('sha256:'))
        self.assertEqual(len(calls),6);self.assertNotIn('test-fixture-token',json.dumps(result))

    def test_api_outage_is_unknown_evidence_not_zero_scheduled_runs(self):
        def fail(*args):raise TimeoutError('test-fixture-private')
        result=audit.audit(fail,NOW)
        self.assertEqual(result['state'],'unavailable');self.assertIsNone(result['scheduledRunCount'])
        self.assertNotIn('test-fixture-private',json.dumps(result))

    def test_notifications_are_optional_daily_and_nonmarket(self):
        workflow=(ROOT/'.github/workflows/data-health.yml').read_text()
        self.assertIn("cron: '43 7 * * *'",workflow)
        self.assertIn("vars.SCOUT_DATA_HEALTH_ALERTS == 'true'",workflow)
        self.assertIn("github.run_attempt == '1'",workflow)
        self.assertIn("github.event_name == 'schedule'",workflow)
        self.assertNotIn('webhook',workflow.lower());self.assertNotIn('wallet',workflow.lower())


if __name__ == '__main__':unittest.main()
