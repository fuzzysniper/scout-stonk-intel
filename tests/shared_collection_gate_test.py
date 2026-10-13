"""Offline, synthetic control metadata; real local Git compare-and-swap races."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from scripts.shared_collection_gate import plan_claim, publication_authorized
from scripts.trigger_contract import slot_key

AT = '2026-10-13T18:17:00Z'
NOW = '2026-10-13T18:18:00Z'
APP = 9001  # synthetic actor, not a real App/credential


def run(source, ident=1):
    return {'id': ident, 'run_attempt': 1, 'repository': 'fuzzysniper/scout-stonk-intel',
            'workflow': 'reward-snapshots.yml', 'head_branch': 'main', 'head_sha': 'a' * 40,
            'created_at': AT, 'actor_id': APP if source == 'external' else 123,
            'event': 'schedule' if source == 'native' else 'workflow_dispatch',
            'trigger_source': source, 'collection_slot': slot_key(AT) if source == 'external' else ''}


class SharedGateTests(unittest.TestCase):
    def test_every_source_first_wins_every_other_source_suppressed(self):
        for first in ('native', 'manual', 'external'):
            decision, journal = plan_claim({'version': 1, 'claims': []}, run(first), NOW, APP, enabled=True)
            self.assertEqual(decision, 'claim_candidate_requires_confirmed_push')
            for second in ('native', 'manual', 'external'):
                self.assertEqual(plan_claim(journal, run(second, 2), NOW, APP, enabled=True), ('duplicate_suppressed', None))

    def test_disabled_and_authentication_fail_closed(self):
        self.assertEqual(plan_claim({}, {}, NOW, APP), ('disabled', None))
        for patch in ({'actor_id': 999}, {'head_branch': 'feature'}, {'run_attempt': 2},
                      {'repository': 'another/repo'}, {'workflow': 'other.yml'}, {'event': 'push'},
                      {'collection_slot': slot_key('2026-10-13T17:17:00Z')}, {'trigger_source': 'arbitrary'}):
            result, _ = plan_claim({'version': 1, 'claims': []}, {**run('external'), **patch}, NOW, APP, enabled=True)
            self.assertNotEqual(result, 'claim_candidate_requires_confirmed_push', patch)

    def test_late_native_manual_and_external_never_backfill(self):
        for source in ('native', 'manual', 'external'):
            self.assertEqual(plan_claim({'version': 1, 'claims': []}, run(source), '2026-10-13T18:33:00Z', APP, enabled=True)[0], 'outside_window')
        native = {**run('native'), 'created_at': '2026-10-13T18:05:00Z'}
        self.assertEqual(plan_claim({'version': 1, 'claims': []}, native, '2026-10-13T18:06:00Z', APP, enabled=True)[0], 'outside_window')

    def test_bad_journal_cannot_erase_claims_or_release_failed_provider(self):
        _, journal = plan_claim({'version': 1, 'claims': []}, run('native'), NOW, APP, enabled=True)
        for broken in ({}, {'version': 2, 'claims': []}, {**journal, 'claims': journal['claims'] * 2},
                       {'version': 1, 'claims': [{**journal['claims'][0], 'claimed_at': '2099-01-01T00:00:00Z'}]}):
            self.assertNotEqual(plan_claim(broken, run('manual'), NOW, APP, enabled=True)[0], 'claim_candidate_requires_confirmed_push')
        self.assertEqual(plan_claim(journal, run('manual'), NOW, APP, enabled=True)[0], 'duplicate_suppressed')

    def test_remote_acceptance_requires_exact_bytes_and_parent(self):
        self.assertTrue(publication_authorized(b'claim', b'claim', 'a' * 40, 'a' * 40))
        self.assertFalse(publication_authorized(b'claim', b'changed', 'a' * 40, 'a' * 40))
        self.assertFalse(publication_authorized(b'claim', b'claim', 'a' * 40, 'b' * 40))

    def test_real_git_race_only_confirmed_claim_can_collect(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            def git(where, *args, okay=True):
                result = subprocess.run(['git', '-C', str(where), *args], capture_output=True, text=True)
                if okay:
                    self.assertEqual(result.returncode, 0, result.stderr)
                return result
            git(root, 'init', '--bare', '--initial-branch=main', 'remote.git')
            git(root, 'clone', str(root / 'remote.git'), 'one')
            one = root / 'one'
            git(one, 'config', 'user.name', 'offline-test')
            git(one, 'config', 'user.email', 'offline@example.invalid')
            (one / 'journal.json').write_text(json.dumps({'version': 1, 'claims': []}))
            git(one, 'add', 'journal.json'); git(one, 'commit', '-m', 'empty local ledger'); git(one, 'push', 'origin', 'HEAD:main')
            base = git(one, 'rev-parse', 'HEAD').stdout.strip()
            git(root, 'clone', str(root / 'remote.git'), 'two')
            two = root / 'two'
            git(two, 'config', 'user.name', 'offline-test'); git(two, 'config', 'user.email', 'offline@example.invalid')
            for work, source in ((one, 'native'), (two, 'external')):
                _, candidate = plan_claim({'version': 1, 'claims': []}, {**run(source), 'head_sha': base}, NOW, APP, enabled=True)
                (work / 'journal.json').write_text(json.dumps(candidate, sort_keys=True))
                git(work, 'add', 'journal.json'); git(work, 'commit', '-m', 'claim before any provider access')
            self.assertEqual(git(one, 'push', 'origin', 'HEAD:main').returncode, 0)
            self.assertNotEqual(git(two, 'push', 'origin', 'HEAD:main', okay=False).returncode, 0)
            remote_bytes = subprocess.check_output(['git', '--git-dir', str(root / 'remote.git'), 'show', 'main:journal.json'])
            remote_parent = subprocess.check_output(['git', '--git-dir', str(root / 'remote.git'), 'rev-parse', 'main^'], text=True).strip()
            self.assertTrue(publication_authorized((one / 'journal.json').read_bytes(), remote_bytes, base, remote_parent))
            self.assertFalse(publication_authorized((two / 'journal.json').read_bytes(), remote_bytes, base, remote_parent))
            # After restart/fetch, even a different trigger or run ID remains suppressed.
            accepted = json.loads(remote_bytes)
            self.assertEqual(plan_claim(accepted, {**run('manual', 3), 'head_sha': base}, NOW, APP, enabled=True)[0], 'duplicate_suppressed')


if __name__ == '__main__':
    unittest.main()
