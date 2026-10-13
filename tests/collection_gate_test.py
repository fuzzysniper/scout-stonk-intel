"""Offline integration: authenticated API fixtures + real disposable Git CAS.

All observation fixtures are synthetic and only written to temporary clones.
No real provider, App, workflow dispatch, credential or production Git write.
"""
import copy
from concurrent.futures import ThreadPoolExecutor
from contextlib import redirect_stdout
import datetime as dt
import json
import io
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import patch

from scripts import collection_gate as adapter
from scripts import collect_rewards as collector
from scripts.trigger_contract import slot_key

ROOT = Path(__file__).resolve().parents[1]
AT = '2026-10-13T19:17:00Z'
NOW = dt.datetime(2026, 10, 13, 19, 18, tzinfo=dt.timezone.utc)
APP, USER, REPOSITORY, WORKFLOW = 9001, 123, 456, 789  # synthetic IDs only
TOKENS = json.loads((ROOT / 'data/tracked-mints.json').read_text())[:2]
WORKFLOW_TEXT = (ROOT / '.github/workflows/reward-snapshots.yml').read_text()
PUBLISH_BLOCK = WORKFLOW_TEXT.split('      - name: Persist observations and summary\n', 1)[1].split('      - name:', 1)[0]
PUBLISH = '\n'.join(line[10:] for line in PUBLISH_BLOCK.split('        run: |\n', 1)[1].splitlines())


def git(root, *args, okay=True):
    result = subprocess.run(['git', *args], cwd=root, capture_output=True, text=True)
    if okay and result.returncode:
        raise AssertionError(result.stderr)
    return result


class FakeIdentity:
    """Models authenticated GET responses, not user-supplied run identity."""
    def __init__(self, env):
        self.paths = []
        self.workflow = {'id': WORKFLOW, 'path': adapter.WORKFLOW_PATH, 'state': 'active'}
        actor = int(env['GITHUB_ACTOR_ID'])
        self.run = {'id': int(env['GITHUB_RUN_ID']), 'run_attempt': 1, 'workflow_id': WORKFLOW,
                    'status': 'in_progress', 'conclusion': None,
                    'path': adapter.WORKFLOW_PATH, 'event': env['GITHUB_EVENT_NAME'], 'head_branch': 'main',
                    'head_sha': env['GITHUB_SHA'], 'created_at': AT,
                    'repository': {'id': REPOSITORY, 'full_name': adapter.REPO},
                    'actor': {'id': actor, 'type': 'Bot' if actor == APP else 'User'},
                    'triggering_actor': {'id': actor}}

    def get(self, path):
        self.paths.append(path)
        if path == '/actions/workflows/reward-snapshots.yml':
            return copy.deepcopy(self.workflow)
        if path == '/actions/runs/' + str(self.run['id']):
            return copy.deepcopy(self.run)
        raise adapter.GateStop('identity_unavailable')


class GitFixture(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.remote = self.root / 'remote.git'
        git(self.root, 'init', '--bare', '--initial-branch=main', str(self.remote))
        self.first = self.clone('first')
        (self.first / 'data').mkdir()
        (self.first / adapter.JOURNAL).write_text('{"claims":[],"version":1}\n')
        (self.first / 'data/reward-snapshots.json').write_text('{}\n')
        (self.first / 'data/collection-summary.json').write_text('{}\n')
        git(self.first, 'add', 'data')
        git(self.first, 'commit', '-m', 'synthetic initial files')
        git(self.first, 'push', 'origin', 'HEAD:main')
        self.base = git(self.first, 'rev-parse', 'HEAD').stdout.strip()
        self.provider_queries = 0
        self.provider_time = NOW

    def clone(self, name):
        result = self.root / name
        git(self.root, 'clone', str(self.remote), str(result))
        git(result, 'config', 'user.name', 'offline-test')
        git(result, 'config', 'user.email', 'fixture@example.invalid')
        return result

    def context(self, source='native', run_id=1, root=None):
        return {'SCOUT_COLLECTION_GATE_ENABLED': 'true', 'SCOUT_COLLECTION_APP_ACTOR_ID': str(APP),
                'SCOUT_TRIGGER_SOURCE': 'external' if source == 'external' else '',
                'SCOUT_COLLECTION_SLOT': slot_key(AT) if source == 'external' else '',
                'GITHUB_REPOSITORY': adapter.REPO, 'GITHUB_REPOSITORY_ID': str(REPOSITORY),
                'GITHUB_REF': 'refs/heads/main', 'GITHUB_WORKFLOW_REF': adapter.WORKFLOW_REF,
                'GITHUB_JOB': 'collect',
                'GITHUB_RUN_ID': str(run_id), 'GITHUB_RUN_ATTEMPT': '1',
                'GITHUB_ACTOR_ID': str(APP if source == 'external' else USER),
                'GITHUB_EVENT_NAME': 'schedule' if source == 'native' else 'workflow_dispatch',
                'GITHUB_SHA': git(root or self.first, 'rev-parse', 'HEAD').stdout.strip()}

    def claims(self, root=None, cls=adapter.GitClaims):
        return cls(root or self.first, expected_remote=str(self.remote))

    def execute(self, env, root=None, identity=None, claims=None, now=None):
        return adapter.gate(env, lambda: identity or FakeIdentity(env), claims or self.claims(root), now or (lambda: NOW))

    def confirm_at_query(self, owner, expected_claim):
        # The assertion executes AT provider access, proving remote acceptance first.
        remote_sha = git(self.remote, 'rev-parse', 'main').stdout.strip()
        remote = json.loads(git(self.remote, 'show', 'main:' + adapter.JOURNAL).stdout)
        self.assertEqual(remote_sha, expected_claim)
        self.assertEqual(remote['claims'][-1]['run_id'], owner)

    def provider(self, token, owner, expected_claim):
        self.confirm_at_query(owner, expected_claim)
        self.provider_queries += 1
        # Exercise the unchanged provider validator and post-response observation
        # clock. Fake network response stays entirely inside this temporary test.
        raw = {'data': {'mint': token['mint'], 'mode': 'reward', 'quote': {'mint': token['quoteMint'], 'symbol': token['quoteSymbol']},
                        'rewards': {'distributedTokens': 1}}, 'meta': {'generatedAt': self.provider_time.isoformat()}}
        class Response:
            def __enter__(self): return self
            def __exit__(self, *_): return False
            def geturl(self): return token['source']
            def read(self, size): return json.dumps(raw).encode()[:size]
        def opener(request, timeout):
            self.assertEqual(request.full_url, token['source']); self.assertEqual(timeout, 8)
            return Response()
        return collector.fetch(token, opener, now=lambda: self.provider_time)

    def collect_when_allowed(self, code, receipt, token_count=1, partial=False, all_failed=False):
        records, summary = {}, {}
        if code == 0 and receipt['collect']:
            def fetcher(token):
                if all_failed or (partial and token == TOKENS[1]):
                    self.confirm_at_query(receipt['run_id'], receipt['claim_commit'])
                    self.provider_queries += 1
                    raise collector.CollectionError('provider_rate_limited')
                return self.provider(token, receipt['run_id'], receipt['claim_commit'])
            collector.collect(TOKENS[:token_count], records, fetcher, lambda _: None, summary)
        return records, summary

    def test_every_source_cas_precedes_provider_and_all_cross_source_duplicates_stop(self):
        for owner in ('native', 'manual', 'external'):
            with self.subTest(owner=owner):
                # Each case uses a new genuine test slot, not a cleared claim.
                clone = self.clone('winner-' + owner)
                index = ('native', 'manual', 'external').index(owner)
                env = self.context(owner, 10 + index, clone)
                at = NOW + dt.timedelta(hours=index)
                self.provider_time = at
                fixture = FakeIdentity(env)
                fixture.run['created_at'] = at.replace(minute=17).isoformat()
                if owner == 'external': env['SCOUT_COLLECTION_SLOT'] = slot_key(fixture.run['created_at'])
                code, receipt = self.execute(env, clone, identity=fixture, now=lambda: at)
                self.assertEqual(code, 0); self.assertTrue(receipt['collect'])
                self.assertEqual(receipt['push'], 'confirmed')
                self.collect_when_allowed(code, receipt)
                for offset, source in enumerate(('native', 'manual', 'external')):
                    duplicate = self.clone('duplicate-' + owner + '-' + source)
                    context = self.context(source, 20 + index * 3 + offset, duplicate)
                    api = FakeIdentity(context); api.run['created_at'] = fixture.run['created_at']
                    if source == 'external': context['SCOUT_COLLECTION_SLOT'] = slot_key(fixture.run['created_at'])
                    status, evidence = self.execute(context, duplicate, api, now=lambda: at)
                    self.assertEqual(status, 0); self.assertFalse(evidence['collect'])
                    self.assertEqual(evidence['decision'], 'duplicate_suppressed')
                    self.assertEqual(evidence['slot'], receipt['slot'])
                    self.assertEqual(self.collect_when_allowed(status, evidence), ({}, {}))
        self.assertEqual(self.provider_queries, 3)

    def test_real_simultaneous_native_manual_external_claims_have_one_winner(self):
        barrier = threading.Barrier(3)
        class ConcurrentClaims(adapter.GitClaims):
            def publish(self, base, candidate, receipt):
                barrier.wait(timeout=10)
                return super().publish(base, candidate, receipt)
        entries = []
        for number, source in enumerate(('native', 'manual', 'external')):
            root = self.clone('concurrent-' + source)
            entries.append((self.context(source, 100 + number, root), root))
        with ThreadPoolExecutor(max_workers=3) as pool:
            results = list(pool.map(lambda entry: self.execute(entry[0], entry[1], claims=self.claims(entry[1], ConcurrentClaims)), entries))
        winners = [receipt for code, receipt in results if code == 0 and receipt['collect']]
        self.assertEqual(len(winners), 1)
        for code, receipt in results: self.collect_when_allowed(code, receipt)
        self.assertEqual(self.provider_queries, 1)
        self.assertEqual(len(json.loads(git(self.remote, 'show', 'main:' + adapter.JOURNAL).stdout)['claims']), 1)

    def test_same_run_identical_commit_concurrent_invocations_collect_once(self):
        barrier = threading.Barrier(2)
        class ConcurrentClaims(adapter.GitClaims):
            def publish(self, base, candidate, receipt):
                barrier.wait(timeout=10)
                return super().publish(base, candidate, receipt)
        other = self.clone('identical-run')
        entries = [(self.context('native', 100, root), root) for root in (self.first, other)]
        with patch.dict(os.environ, {'GIT_AUTHOR_DATE': AT, 'GIT_COMMITTER_DATE': AT}), ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda entry: self.execute(entry[0], entry[1], claims=self.claims(entry[1], ConcurrentClaims)), entries))
        self.assertEqual(sum(code == 0 and receipt['collect'] for code, receipt in results), 1)
        commits = [git(root, 'rev-parse', 'HEAD').stdout.strip() for _, root in entries]
        self.assertEqual(commits[0], commits[1])  # exact same Git object, not timing luck
        for code, receipt in results: self.collect_when_allowed(code, receipt)
        self.assertEqual(self.provider_queries, 1)

    def test_up_to_date_push_is_not_exclusive_even_when_confirmation_matches(self):
        class AlreadyPublished(adapter.GitClaims):
            def command(self, *args):
                if args[0] == 'push':
                    super().command(*args)  # simulate other publisher with identical object
                return super().command(*args)
        code, receipt = self.execute(self.context(), claims=self.claims(cls=AlreadyPublished))
        self.assertEqual(code, 1); self.assertFalse(receipt['collect'])
        self.assertEqual(receipt['decision'], 'claim_push_not_exclusive')
        self.assertEqual(git(self.remote, 'rev-parse', 'main').stdout.strip(), receipt['claim_commit'])
        self.assertEqual(self.provider_queries, 0)

    def test_disabled_no_identity_or_git_and_legacy_workflow_commands_unchanged(self):
        def forbidden(): raise AssertionError('disabled must not authenticate')
        class ForbiddenGit:
            def read(self, _): raise AssertionError('disabled must not access Git')
        for setting in ('', 'false'):
            for source in ('native', 'manual'):
                env = {**self.context(source), 'SCOUT_COLLECTION_GATE_ENABLED': setting}
                code, receipt = adapter.gate(env, forbidden, ForbiddenGit(), lambda: NOW)
                self.assertEqual(code, 0); self.assertTrue(receipt['collect'])
                self.assertEqual(receipt['decision'], 'legacy_collection_unchanged')
        for env in [{**self.context('external'), 'SCOUT_COLLECTION_GATE_ENABLED': ''},
                    {**self.context('manual'), 'SCOUT_COLLECTION_GATE_ENABLED': 'TRUE'},
                    {**self.context('manual'), 'SCOUT_COLLECTION_GATE_ENABLED': 'yes'},
                    {**self.context('external'), 'SCOUT_TRIGGER_SOURCE': '', 'SCOUT_COLLECTION_SLOT': '', 'SCOUT_COLLECTION_GATE_ENABLED': ''}]:
            code, receipt = adapter.gate(env, forbidden, ForbiddenGit(), lambda: NOW)
            self.assertEqual(code, 1); self.assertFalse(receipt['collect'])
        self.assertIn('run: python scripts/collect_rewards.py', WORKFLOW_TEXT)
        self.assertIn("steps.gate.outcome == 'skipped'", WORKFLOW_TEXT)
        self.assertEqual(WORKFLOW_TEXT.split('permissions:\n', 1)[1].split('concurrency:', 1)[0], '  contents: write\n')
        original_artifact = WORKFLOW_TEXT.split('      - name: Preserve diagnostic evidence\n', 1)[1].split('      - name:', 1)[0]
        self.assertNotIn('collection-slots.json', original_artifact)
        self.assertNotIn('runner.temp', original_artifact)

    def test_authenticated_identity_rejects_context_spoofed_api_actors_and_reruns(self):
        env = self.context('external')
        api = FakeIdentity(env)
        cases = [{'id': 2}, {'workflow_id': 88}, {'path': '.github/workflows/other.yml'},
                 {'head_branch': 'feature'}, {'head_sha': 'a' * 40}, {'event': 'push'}, {'run_attempt': 2},
                 {'status': 'completed'}, {'conclusion': 'cancelled'},
                 {'actor': {'id': 99, 'type': 'Bot'}}, {'actor': {'id': APP, 'type': 'User'}},
                 {'triggering_actor': {'id': 99}}, {'repository': {'id': REPOSITORY, 'full_name': 'other/repo'}},
                 {'repository': {'id': 99, 'full_name': adapter.REPO}}]
        for changes in cases:
            forged = copy.deepcopy(api); forged.run.update(changes)
            code, receipt = self.execute(env, identity=forged)
            self.assertEqual(code, 1, changes); self.assertFalse(receipt['collect'])
        for changes in [{'GITHUB_REF': 'refs/heads/feature'}, {'GITHUB_RUN_ATTEMPT': '2'},
                        {'GITHUB_REPOSITORY': 'other/repo'}, {'GITHUB_WORKFLOW_REF': 'other'},
                        {'GITHUB_JOB': 'another-job'},
                        {'GITHUB_RUN_ID': '1;echo secret'}, {'SCOUT_COLLECTION_APP_ACTOR_ID': '99'},
                        {'SCOUT_TRIGGER_SOURCE': 'manual', 'SCOUT_COLLECTION_SLOT': ''},
                        {'SCOUT_TRIGGER_SOURCE': '', 'SCOUT_COLLECTION_SLOT': ''}]:
            code, receipt = self.execute({**env, **changes}, identity=api)
            self.assertEqual(code, 1, changes); self.assertFalse(receipt['collect'])
        manual = self.context('manual'); unexpected_bot = FakeIdentity(manual); unexpected_bot.run['actor']['type'] = 'Bot'
        self.assertEqual(self.execute(manual, identity=unexpected_bot)[0], 1)
        self.assertEqual(self.provider_queries, 0)

    def test_future_late_replay_delayed_schedule_and_expired_after_push_are_not_backfill(self):
        for source in ('native', 'manual', 'external'):
            for current in (NOW - dt.timedelta(minutes=2), NOW + dt.timedelta(minutes=15)):
                code, receipt = self.execute(self.context(source), now=lambda: current)
                self.assertEqual(code, 1); self.assertFalse(receipt['collect'])
        native = self.context(); api = FakeIdentity(native)
        api.run['created_at'] = '2026-10-13T19:35:00Z'
        self.assertEqual(self.execute(native, identity=api, now=lambda: NOW.replace(minute=36))[1]['decision'], 'outside_window')
        times = iter([NOW, NOW, NOW + dt.timedelta(minutes=15)])
        code, receipt = self.execute(self.context(), now=lambda: next(times))
        self.assertEqual(receipt['push'], 'confirmed'); self.assertFalse(receipt['collect'])
        self.assertEqual(receipt['decision'], 'collection_window_expired_after_claim')
        retry = self.clone('after-expiry')
        code, receipt = self.execute(self.context('manual', 2, retry), retry)
        self.assertFalse(receipt['collect'])

    def test_race_audit_commit_before_push_preserves_candidate_and_stops_provider(self):
        audit = self.clone('audit')
        outer = self
        class AuditRace(adapter.GitClaims):
            def publish(self, base, candidate, receipt):
                (audit / 'data/collector-audit.json').write_text('{"synthetic":true}\n')
                git(audit, 'add', 'data/collector-audit.json'); git(audit, 'commit', '-m', 'offline audit race')
                git(audit, 'push', 'origin', 'HEAD:main')
                return super().publish(base, candidate, receipt)
        code, receipt = self.execute(self.context(), claims=self.claims(cls=AuditRace))
        self.assertEqual(code, 1); self.assertEqual(receipt['decision'], 'main_advanced_before_push')
        self.collect_when_allowed(code, receipt); self.assertEqual(outer.provider_queries, 0)
        self.assertIn('claim_commit', receipt)
        self.assertEqual(json.loads(git(self.remote, 'show', 'main:' + adapter.JOURNAL).stdout)['claims'], [])
        self.assertNotEqual(git(self.first, 'rev-parse', 'HEAD').stdout.strip(), git(self.remote, 'rev-parse', 'main').stdout.strip())

    def test_actual_non_fast_forward_push_conflict_and_corrupt_confirmation_stop_closed(self):
        competitor = self.clone('competitor')
        class PushRace(adapter.GitClaims):
            def command(self, *args):
                if args[0] == 'push':
                    (competitor / 'audit.txt').write_text('synthetic race after final fetch\n')
                    git(competitor, 'add', 'audit.txt'); git(competitor, 'commit', '-m', 'offline competing commit')
                    git(competitor, 'push', 'origin', 'HEAD:main')
                return super().command(*args)
        code, receipt = self.execute(self.context(), claims=self.claims(cls=PushRace))
        self.assertEqual(code, 1); self.assertEqual(receipt['decision'], 'claim_push_rejected_or_uncertain')
        self.assertEqual(receipt['push'], 'attempted_unknown'); self.assertFalse(receipt['collect'])
        # Use fresh main to isolate accepted push but wrong bytes on readback.
        latest = self.clone('corrupt-readback')
        class CorruptConfirmation(adapter.GitClaims):
            def command(self, *args):
                value = super().command(*args)
                if args[0] == 'show' and self.revision('HEAD') != self.base:
                    return b'{"claims":[],"version":1}\n'
                return value
        claims = self.claims(latest, CorruptConfirmation); claims.base = git(latest, 'rev-parse', 'HEAD').stdout.strip()
        code, receipt = self.execute(self.context(root=latest), latest, claims=claims)
        self.assertEqual(code, 1); self.assertEqual(receipt['decision'], 'claim_confirmation_mismatch')
        self.assertEqual(receipt['push'], 'success_unconfirmed'); self.assertFalse(receipt['collect'])
        self.assertEqual(self.provider_queries, 0)

    def test_response_lost_after_accepted_push_and_interrupted_claim_survive_restart(self):
        class LostResponse(adapter.GitClaims):
            def command(self, *args):
                value = super().command(*args)
                if args[0] == 'push': raise adapter.GateStop('git_unavailable')
                return value
        code, receipt = self.execute(self.context(), claims=self.claims(cls=LostResponse))
        self.assertEqual(code, 1); self.assertFalse(receipt['collect'])
        self.assertEqual(json.loads(git(self.remote, 'show', 'main:' + adapter.JOURNAL).stdout)['claims'][0]['run_id'], 1)
        restart = self.clone('restart')
        code, receipt = self.execute(self.context('external', 2, restart), restart)
        self.assertEqual(receipt['decision'], 'duplicate_suppressed'); self.assertFalse(receipt['collect'])
        # Next genuine hour can proceed. No release or replay of the lost slot.
        next_env = self.context('external', 3, restart); api = FakeIdentity(next_env)
        api.run['created_at'] = '2026-10-13T20:17:00Z'; next_env['SCOUT_COLLECTION_SLOT'] = slot_key(api.run['created_at'])
        code, receipt = self.execute(next_env, restart, api, now=lambda: NOW + dt.timedelta(hours=1))
        self.assertEqual(code, 0); self.assertTrue(receipt['collect'])
        journal = json.loads(git(self.remote, 'show', 'main:' + adapter.JOURNAL).stdout)
        self.assertEqual(len(journal['claims']), 2)
        self.provider_time = NOW + dt.timedelta(hours=1)
        records, summary = self.collect_when_allowed(code, receipt)
        self.assertEqual(summary['overall'], 'complete')
        self.assertEqual([row['observedAt'] for row in records[TOKENS[0]['mint']]], [self.provider_time.isoformat(timespec='seconds')])
        self.assertEqual(self.provider_queries, 1)

    def test_partial_and_all_failed_provider_never_release_claim_or_fabricate_points(self):
        code, receipt = self.execute(self.context('external'))
        records, summary = self.collect_when_allowed(code, receipt, token_count=2, partial=True)
        self.assertEqual(summary['overall'], 'partial'); self.assertNotIn(TOKENS[1]['mint'], records)
        self.assertEqual(records[TOKENS[0]['mint']][0]['observedAt'], NOW.isoformat(timespec='seconds'))
        (self.first / 'data/reward-snapshots.json').write_text(json.dumps(records))
        (self.first / 'data/collection-summary.json').write_text(json.dumps(summary))
        result = subprocess.run(['bash', '-c', PUBLISH], cwd=self.first, env={**os.environ, 'GITHUB_STEP_SUMMARY': str(self.root / 'summary')}, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        data_commit = git(self.remote, 'rev-parse', 'main').stdout.strip()
        self.assertEqual(git(self.remote, 'rev-parse', data_commit + '^').stdout.strip(), receipt['claim_commit'])
        duplicate = self.clone('partial-duplicate')
        self.assertFalse(self.execute(self.context('manual', 2, duplicate), duplicate)[1]['collect'])
        all_failed = self.clone('all-failed')
        env = self.context('native', 3, all_failed); api = FakeIdentity(env); api.run['created_at'] = '2026-10-13T20:17:00Z'
        code, receipt = self.execute(env, all_failed, api, now=lambda: NOW + dt.timedelta(hours=1))
        records, summary = self.collect_when_allowed(code, receipt, token_count=2, all_failed=True)
        self.assertEqual(records, {}); self.assertEqual(summary['overall'], 'failed')
        retry = self.clone('failed-duplicate')
        env = self.context('external', 4, retry); api = FakeIdentity(env); api.run['created_at'] = '2026-10-13T20:17:00Z'; env['SCOUT_COLLECTION_SLOT'] = slot_key(api.run['created_at'])
        self.assertFalse(self.execute(env, retry, api, now=lambda: NOW + dt.timedelta(hours=1))[1]['collect'])

    def test_data_push_conflict_after_collection_preserves_real_candidate_and_claim(self):
        code, receipt = self.execute(self.context())
        records, summary = self.collect_when_allowed(code, receipt)
        (self.first / 'data/reward-snapshots.json').write_text(json.dumps(records))
        (self.first / 'data/collection-summary.json').write_text(json.dumps(summary))
        audit = self.clone('after-query-audit')
        (audit / 'audit.txt').write_text('synthetic human/audit publication\n'); git(audit, 'add', 'audit.txt')
        git(audit, 'commit', '-m', 'race after confirmed claim'); git(audit, 'push', 'origin', 'HEAD:main')
        expected = git(self.remote, 'rev-parse', 'main').stdout.strip()
        result = subprocess.run(['bash', '-c', PUBLISH], cwd=self.first, env={**os.environ, 'GITHUB_STEP_SUMMARY': str(self.root / 'summary')}, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(git(self.remote, 'rev-parse', 'main').stdout.strip(), expected)
        self.assertEqual(json.loads(git(self.remote, 'show', 'main:data/reward-snapshots.json').stdout), {})
        self.assertEqual(json.loads((self.first / 'data/reward-snapshots.json').read_text()), records)
        self.assertEqual(json.loads(git(self.remote, 'show', 'main:' + adapter.JOURNAL).stdout)['claims'][0]['run_id'], 1)

    def test_missing_corrupt_dirty_or_untrusted_remote_never_collects(self):
        (self.first / adapter.JOURNAL).write_text('invalid local change')
        self.assertEqual(self.execute(self.context())[1]['decision'], 'dirty_checkout')
        git(self.first, 'checkout', '--', adapter.JOURNAL)
        git(self.first, 'rm', adapter.JOURNAL); git(self.first, 'commit', '-m', 'synthetic missing journal'); git(self.first, 'push', 'origin', 'HEAD:main')
        self.assertEqual(self.execute(self.context())[1]['decision'], 'journal_missing_or_unsafe')
        self.assertEqual(self.execute(self.context(), claims=adapter.GitClaims(self.first))[1]['decision'], 'remote_rejected')
        self.assertEqual(self.provider_queries, 0)


class IdentityTransportTests(unittest.TestCase):
    def test_https_authorization_origin_deadline_caps_and_redacted_failures(self):
        class Response:
            status = 200
            def __init__(self, raw=b'{"id":123}', url=adapter.API + '/actions/runs/123'):
                self.raw, self.url = raw, url
            def __enter__(self): return self
            def __exit__(self, *_): return False
            def geturl(self): return self.url
            def read(self, size): return self.raw[:size]
        class Opener:
            def __init__(self, response): self.response, self.calls = response, []
            def open(self, request, timeout):
                self.calls.append((request.full_url, request.get_header('Authorization'), timeout))
                return self.response
        opener = Opener(Response())
        client = adapter.GitHubIdentity('offline-mock-not-a-credential', opener)
        self.assertEqual(client.get('/actions/runs/123'), {'id': 123})
        self.assertEqual(opener.calls, [(adapter.API + '/actions/runs/123', 'Bearer offline-mock-not-a-credential', 8)])
        for response in (Response(b'x' * (adapter.MAX_BYTES + 1)), Response(b'{bad'), Response(url='https://other.invalid/')):
            with self.assertRaises(adapter.GateStop) as caught:
                adapter.GitHubIdentity('offline-mock-not-a-credential', Opener(response)).get('/actions/runs/123')
            self.assertNotIn('offline-mock', str(caught.exception))
        with self.assertRaises(adapter.GateStop): adapter.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.invalid/')

    def test_receipt_failure_or_api_failure_cannot_emit_collection_authorization(self):
        with tempfile.TemporaryDirectory() as directory:
            env = {'RUNNER_TEMP': directory, 'GITHUB_OUTPUT': str(Path(directory) / 'outputs')}
            capture = io.StringIO()
            with patch.dict(os.environ, env, clear=True), patch.object(adapter, 'write_receipt', side_effect=OSError('synthetic-private-error')), redirect_stdout(capture):
                self.assertEqual(adapter.main(), 1)
            self.assertEqual(capture.getvalue(), 'Shared collection gate: receipt_or_output_unavailable\n')
            self.assertFalse((Path(directory) / 'outputs').exists())
        def unavailable(): raise RuntimeError('synthetic-private-error')
        env = {'SCOUT_COLLECTION_GATE_ENABLED': 'true'}
        code, receipt = adapter.gate(env, unavailable, None, lambda: NOW)
        self.assertEqual(code, 1); self.assertFalse(receipt['collect'])
        self.assertNotIn('private-error', json.dumps(receipt))


if __name__ == '__main__':
    unittest.main()
