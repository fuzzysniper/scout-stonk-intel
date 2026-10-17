"""Offline operational fixtures. Socket creation is forbidden; no live token."""
import copy
from contextlib import redirect_stdout
import datetime as dt
import io
import json
import socket
import signal
import unittest
import urllib.error
from unittest.mock import patch

from scheduler.c2 import collector_identity as p
from scripts.collection_gate import API, GateStop, NoRedirect

NOW = dt.datetime(2026, 10, 17, 6, 30, tzinfo=dt.timezone.utc)
TOKEN = 'offline-collector-token-sentinel'
RUN = 123456
RUN_PATH = '/actions/runs/' + str(RUN)
JOBS_PATH = RUN_PATH + '/attempts/1/jobs?per_page=2'
WF_PATH = '/actions/workflows/reward-snapshots.yml'


def environment():
    return {'SCOUT_C2_COLLECTOR_PROOF': 'auth-only', 'SCOUT_C2_GATE_ABSENT_ATTESTED': 'true',
            'SCOUT_COLLECTION_GATE_ENABLED': '', 'SCOUT_COLLECTION_APP_ACTOR_ID': str(p.APP_ACTOR_ID),
            'SCOUT_C2_COLLECTOR_APPROVED_SHA': 'a'*40, 'SCOUT_C2_COLLECTOR_NOT_BEFORE': '2026-10-17T06:00:00Z',
            'SCOUT_C2_COLLECTOR_EXPIRES_AT': '2026-10-17T07:00:00Z',
            'GITHUB_ACTIONS': 'true', 'RUNNER_ENVIRONMENT': 'github-hosted', 'RUNNER_OS': 'Linux',
            'GITHUB_REPOSITORY': p.REPO, 'GITHUB_REPOSITORY_ID': str(p.REPO_ID),
            'GITHUB_REF': 'refs/heads/main', 'GITHUB_EVENT_NAME': 'schedule', 'GITHUB_JOB': 'collect',
            'GITHUB_WORKFLOW_REF': p.REPO + '/' + p.WORKFLOW_PATH + '@refs/heads/main',
            'GITHUB_ACTOR': 'fuzzysniper', 'GITHUB_ACTOR_ID': str(p.OWNER_ID), 'GITHUB_RUN_ATTEMPT': '1',
            'GITHUB_SHA': 'a'*40, 'GITHUB_WORKFLOW_SHA': 'a'*40, 'GITHUB_RUN_ID': str(RUN), 'GITHUB_TOKEN': TOKEN}


def fixtures():
    return {WF_PATH: {'id': p.WORKFLOW_ID, 'path': p.WORKFLOW_PATH, 'state': 'active'},
            RUN_PATH: {'id': RUN, 'workflow_id': p.WORKFLOW_ID, 'path': p.WORKFLOW_PATH, 'run_attempt': 1,
                       'event': 'schedule', 'head_branch': 'main', 'head_sha': 'a'*40,
                       'status': 'in_progress', 'conclusion': None, 'created_at': '2026-10-17T06:29:30Z',
                       'repository': {'id': p.REPO_ID, 'full_name': p.REPO},
                       'actor': {'id': p.OWNER_ID, 'login': 'fuzzysniper', 'type': 'User'},
                       'triggering_actor': {'id': p.OWNER_ID, 'login': 'fuzzysniper', 'type': 'User'}},
            JOBS_PATH: {'total_count': 1, 'jobs': [{'id': 987654, 'run_id': RUN, 'name': 'collect',
                         'head_sha': 'a'*40, 'status': 'in_progress', 'conclusion': None,
                         'steps': [{'name': p.PROOF_STEP, 'number': 4, 'status': 'in_progress', 'conclusion': None}]}]}}


class Response(io.BytesIO):
    status = 200

    def __init__(self, data, url):
        super().__init__(data)
        self.url = url

    def geturl(self):
        return self.url


class ProofTests(unittest.TestCase):
    def setUp(self):
        blocker = patch.object(socket, 'create_connection', side_effect=AssertionError('offline network forbidden'))
        blocker.start()
        self.addCleanup(blocker.stop)

    def safe(self, result):
        text = json.dumps(result)
        self.assertNotIn(TOKEN, text)
        self.assertNotIn('offline-sensitive-error', text)
        for key in ('dispatches', 'collectionClaims', 'providerQueries', 'repositoryWrites'):
            self.assertEqual(result[key], 0)
        for key in ('pilotReady', 'hostedBindingVerified', 'gitClaimVerified'):
            self.assertIs(result[key], False)

    def proof(self, env=None, data=None, fail=None):
        records, calls = fixtures() if data is None else data, []

        class Client:
            def __init__(self, token, run_id):
                assert token == TOKEN and run_id == RUN

            def get(self, path):
                calls.append(path)
                if fail:
                    raise fail
                return records[path]

        result = p.inspect(environment() if env is None else env, Client, NOW)
        self.safe(result)
        return result, calls

    def test_success_is_actual_collect_job_identity_not_hosted_or_git_cas(self):
        result, calls = self.proof()
        self.assertTrue(result['passed'])
        self.assertEqual(result['reason'], 'verified')
        self.assertTrue(result['collectorWorkflowTokenVerified'])
        self.assertTrue(result['collectionGateAbsentAttested'])
        self.assertEqual(result['jobId'], 987654)
        self.assertEqual(calls, [WF_PATH, RUN_PATH, JOBS_PATH])

    def test_all_preconditions_reject_before_reading_token(self):
        changes = {'SCOUT_C2_COLLECTOR_PROOF': ['', 'false', 'AUTH-ONLY', ' auth-only', None],
                   'SCOUT_C2_GATE_ABSENT_ATTESTED': ['', 'false'],
                   'SCOUT_COLLECTION_GATE_ENABLED': ['false', 'true', 'unknown'],
                   'SCOUT_COLLECTION_APP_ACTOR_ID': ['', '1', '900000001'],
                   'GITHUB_EVENT_NAME': ['push', 'workflow_dispatch', 'pull_request_target'],
                   'GITHUB_JOB': ['identity-only'], 'GITHUB_REF': ['refs/heads/proof'],
                   'GITHUB_REPOSITORY': ['other/repo'], 'GITHUB_REPOSITORY_ID': ['1'],
                   'GITHUB_ACTOR_ID': [str(p.APP_ACTOR_ID)], 'GITHUB_ACTOR': ['other'],
                   'GITHUB_WORKFLOW_REF': ['wrong'], 'GITHUB_RUN_ATTEMPT': ['2'], 'GITHUB_RUN_ID': ['0', 'bad'],
                   'GITHUB_SHA': ['bad', 'b'*40], 'GITHUB_WORKFLOW_SHA': ['b'*40],
                   'SCOUT_C2_COLLECTOR_APPROVED_SHA': ['', 'b'*40],
                   'SCOUT_C2_COLLECTOR_NOT_BEFORE': ['2026-10-17T06:31:00Z', 'bad', '2026-10-15T00:00:00Z'],
                   'SCOUT_C2_COLLECTOR_EXPIRES_AT': ['2026-10-17T06:30:00Z', '2026-10-19T00:00:00Z'],
                   'SCOUT_COLLECTION_SLOT': ['slot'], 'SCOUT_TRIGGER_SOURCE': ['external'],
                   'GITHUB_ACTIONS': ['false'], 'RUNNER_ENVIRONMENT': ['self-hosted'], 'RUNNER_OS': ['Windows']}

        token_reads = []

        class UnreadableToken(dict):
            def get(self, key, *args):
                if key == 'GITHUB_TOKEN':
                    token_reads.append(True)
                    raise AssertionError('token accessed before context validated')
                return super().get(key, *args)

        for field, values in changes.items():
            for value in values:
                env = UnreadableToken(environment())
                if value is None:
                    env.pop(field, None)
                else:
                    env[field] = value
                factory_calls = []
                result = p.inspect(env, lambda *_: factory_calls.append(True), NOW)
                self.assertFalse(result['passed'], (field, value))
                self.assertEqual(factory_calls, [])
                self.assertEqual(token_reads, [])
        for name in ['APP_PRIVATE_KEY', 'SCOUT_APP_PRIVATE_KEY', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_GLOBAL_API_KEY', 'GH_TOKEN']:
            env = UnreadableToken(environment()); env[name] = 'offline-sensitive-error'
            result, calls = self.proof(env)
            self.assertFalse(result['passed']); self.assertEqual(calls, [])
            self.assertEqual(token_reads, [])

    def test_wrong_authenticated_workflow_run_actor_time_and_types_reject(self):
        for field, value in [('id', 1), ('workflow_id', 1), ('run_attempt', 2), ('run_attempt', True),
                             ('path', 'wrong'), ('head_sha', 'b'*40), ('head_branch', 'proof'),
                             ('status', 'completed'), ('conclusion', 'success'), ('event', 'workflow_dispatch'),
                             ('repository', {'id': 1, 'full_name': p.REPO}),
                             ('actor', {'id': p.OWNER_ID, 'login': 'fuzzysniper', 'type': 'Bot'}),
                             ('triggering_actor', {'id': p.OWNER_ID, 'login': 'other', 'type': 'User'}),
                             ('created_at', '2026-10-17T06:20:00Z'), ('created_at', '2026-10-17T06:31:00Z')]:
            data = fixtures(); data[RUN_PATH][field] = value
            result, _ = self.proof(data=data); self.assertFalse(result['passed'], field)
        for field, value in [('id', 1), ('id', True), ('path', 'wrong'), ('state', 'disabled_manually')]:
            data = fixtures(); data[WF_PATH][field] = value
            result, _ = self.proof(data=data); self.assertFalse(result['passed'])

    def test_jobs_pagination_other_job_stale_step_and_untrusted_ids_reject(self):
        mutations = [lambda d: d.update(total_count=2), lambda d: d.update(total_count=True),
                     lambda d: d.update(jobs=[]), lambda d: d['jobs'].append(copy.deepcopy(d['jobs'][0]))]
        for field, value in [('id', True), ('run_id', 1), ('name', 'identity-only'), ('head_sha', 'b'*40),
                             ('status', 'completed'), ('conclusion', 'success'), ('steps', [])]:
            mutations.append(lambda d, f=field, v=value: d['jobs'][0].update({f: v}))
        for field, value in [('name', 'Collect observations'), ('status', 'completed'), ('conclusion', 'success'), ('number', True)]:
            mutations.append(lambda d, f=field, v=value: d['jobs'][0]['steps'][0].update({f: v}))
        mutations.append(lambda d: d['jobs'][0]['steps'].append(copy.deepcopy(d['jobs'][0]['steps'][0])))
        for change in mutations:
            data = fixtures(); change(data[JOBS_PATH])
            result, _ = self.proof(data=data); self.assertFalse(result['passed'])

    def test_authenticated_fixed_transport_no_writes_redirects_or_fallback(self):
        calls = []

        class Opener:
            def open(self, request, timeout):
                calls.append(request)
                assert request.get_method() == 'GET' and request.headers['Authorization'] == 'Bearer '+TOKEN and timeout == 8
                return Response(b'{}', request.full_url)

        client = p.Identity(TOKEN, RUN, Opener())
        for path in (WF_PATH, RUN_PATH, JOBS_PATH):
            self.assertEqual(client.get(path), {})
        self.assertEqual([r.full_url for r in calls], [API+x for x in (WF_PATH, RUN_PATH, JOBS_PATH)])
        for path in ['/dispatches', '/git/refs/heads/main', '/actions/runs/9999', '//untrusted.invalid', '/actions/variables']:
            with self.assertRaises(GateStop):
                client.get(path)
        self.assertEqual(len(calls), 3)
        for token in [None, '', 'x'*8193, 'bad\n', 'bad\0']:
            with self.assertRaises(GateStop):
                p.Identity(token, RUN, Opener())
        with self.assertRaises(GateStop):
            NoRedirect().redirect_request(None, None, None, None, None, None)

    def test_failures_malformed_oversized_url_drift_no_retry_or_raw_errors(self):
        for failure in [urllib.error.HTTPError(API, code, 'offline-sensitive-error', {}, None) for code in [401, 403, 429, 503]] + [TimeoutError('offline-sensitive-error')]:
            calls = []

            class Opener:
                def open(self, *_args, **_kwargs):
                    calls.append(True)
                    raise failure

            def factory(token, run_id):
                return p.Identity(token, run_id, Opener())

            result = p.inspect(environment(), factory, NOW)
            self.assertFalse(result['passed']); self.assertEqual(len(calls), 1); self.safe(result)
            self.assertEqual(result['reason'], {401: 'identity_read_unauthorized', 403: 'identity_read_forbidden'}.get(getattr(failure, 'code', None), 'identity_unavailable'))
        for value in [b'{', b'[]', b'x'*131073, b'\xff', b'']:
            class Opener:
                def open(self, request, timeout):
                    return Response(value, request.full_url)
            with self.assertRaises(GateStop):
                p.Identity(TOKEN, RUN, Opener()).get(WF_PATH)
        class Redirected:
            def open(self, request, timeout):
                return Response(b'{}', 'https://untrusted.invalid')
        with self.assertRaises(GateStop):
            p.Identity(TOKEN, RUN, Redirected()).get(WF_PATH)

    @unittest.skipUnless(hasattr(signal, 'setitimer'), 'Linux Actions deadline only')
    def test_cli_deadline_stops_transport_and_cancels_timer_without_retries(self):
        calls, stdout = [], io.StringIO()

        class Opener:
            def open(self, *_args, **_kwargs):
                calls.append(True)
                signal.raise_signal(signal.SIGALRM)
                raise AssertionError('deadline must interrupt request')

        previous = signal.getsignal(signal.SIGALRM)
        actual_inspect = p.inspect
        try:
            with patch.dict(p.os.environ, environment(), clear=True), patch.object(p.sys, 'argv', ['proof', '--approved-collector-identity-only']), \
                    patch('urllib.request.build_opener', return_value=Opener()), \
                    patch.object(p, 'inspect', side_effect=lambda env: actual_inspect(env, now=NOW)), redirect_stdout(stdout):
                self.assertEqual(p.main(), 1)
            result = json.loads(stdout.getvalue())
            self.assertEqual(result['reason'], 'proof_deadline_exceeded')
            self.assertEqual(calls, [True]); self.safe(result)
            self.assertEqual(signal.getitimer(signal.ITIMER_REAL), (0.0, 0.0))
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
            signal.signal(signal.SIGALRM, previous)


if __name__ == '__main__':
    unittest.main()
