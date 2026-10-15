"""Opt-in GitHub workflow gate. DEFAULT OFF; never invokes a provider or collector.

The next workflow step may collect only after this process emits collect=true.
Enabled mode authenticates the actual run and confirms a non-force main claim.
CLI uses the fixed repository checkout, existing ephemeral Actions token and Git
checkout credentials. Tests inject mock API and disposable local Git remotes.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import tempfile
import urllib.request
import urllib.error

from scripts.shared_collection_gate import plan_claim, publication_authorized
from scripts.trigger_contract import MAX_LATE, utc, slot_key

REPO = 'fuzzysniper/scout-stonk-intel'
WORKFLOW_PATH = '.github/workflows/reward-snapshots.yml'
WORKFLOW_REF = REPO + '/' + WORKFLOW_PATH + '@refs/heads/main'
API = 'https://api.github.com/repos/' + REPO
REMOTE = 'https://github.com/' + REPO
JOURNAL = 'data/collection-slots.json'
MAX_BYTES = 128 * 1024


class GateStop(Exception):
    """Reasons are local fixed strings; never raw Git/API/provider exception text."""


def sha(value):
    return isinstance(value, str) and re.fullmatch(r'[a-f0-9]{40}', value) is not None


def positive(value):
    return type(value) is int and 0 < value <= 2**53 - 1


def context_id(value):
    if not isinstance(value, str) or not re.fullmatch(r'[1-9]\d{0,15}', value) or not positive(int(value)):
        raise GateStop('invalid_run_context')
    return int(value)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise GateStop('identity_redirect_rejected')


class GitHubIdentity:
    def __init__(self, token, opener=None):
        if not isinstance(token, str) or not token or len(token) > 8192:
            raise GateStop('identity_token_missing')
        self.token = token
        self.opener = opener or urllib.request.build_opener(NoRedirect())

    def get(self, path):
        # Caller passes only two fixed paths with previously validated numeric ID.
        request = urllib.request.Request(API + path, headers={
            'Accept': 'application/vnd.github+json', 'User-Agent': 'SCOUT-Claim-Gate/1.0',
            'Authorization': 'Bearer ' + self.token, 'X-GitHub-Api-Version': '2026-03-10'})
        try:
            with self.opener.open(request, timeout=8) as response:
                if response.status in (401, 403):
                    raise GateStop('identity_read_unauthorized' if response.status == 401 else 'identity_read_forbidden')
                if response.status != 200 or response.geturl() != API + path:
                    raise GateStop('identity_response_rejected')
                data = response.read(MAX_BYTES + 1)
                if len(data) > MAX_BYTES:
                    raise GateStop('identity_response_oversized')
                value = json.loads(data)
                if not isinstance(value, dict):
                    raise GateStop('identity_response_rejected')
                return value
        except GateStop:
            raise
        except urllib.error.HTTPError as exc:
            # Status only; a 403 is not proof of its cause. Never echo bodies/headers.
            reason = {401: 'identity_read_unauthorized', 403: 'identity_read_forbidden'}.get(exc.code, 'identity_unavailable')
            raise GateStop(reason) from None
        except Exception:
            raise GateStop('identity_unavailable') from None


def authenticate_run(env, identity):
    """Bind trusted Actions context to authenticated GitHub REST, never input IDs."""
    if (env.get('GITHUB_REPOSITORY') != REPO or env.get('GITHUB_REF') != 'refs/heads/main' or
            env.get('GITHUB_WORKFLOW_REF') != WORKFLOW_REF or env.get('GITHUB_JOB') != 'collect' or
            env.get('GITHUB_EVENT_NAME') not in ('schedule', 'workflow_dispatch')):
        raise GateStop('invalid_run_context')
    run_id = context_id(env.get('GITHUB_RUN_ID'))
    actor_id = context_id(env.get('GITHUB_ACTOR_ID'))
    repository_id = context_id(env.get('GITHUB_REPOSITORY_ID'))
    if env.get('GITHUB_RUN_ATTEMPT') != '1' or not sha(env.get('GITHUB_SHA')):
        raise GateStop('rerun_or_invalid_context')
    workflow = identity.get('/actions/workflows/reward-snapshots.yml')
    record = identity.get('/actions/runs/' + str(run_id))
    actor, triggering = record.get('actor'), record.get('triggering_actor')
    repository = record.get('repository')
    if (not positive(workflow.get('id')) or workflow.get('path') != WORKFLOW_PATH or workflow.get('state') != 'active' or
            type(record.get('id')) is not int or record['id'] != run_id or record.get('run_attempt') != 1 or type(record.get('run_attempt')) is not int or
            record.get('workflow_id') != workflow['id'] or type(record.get('workflow_id')) is not int or record.get('path') != WORKFLOW_PATH or
            record.get('status') != 'in_progress' or record.get('conclusion') is not None or
            record.get('event') != env['GITHUB_EVENT_NAME'] or record.get('head_branch') != 'main' or record.get('head_sha') != env['GITHUB_SHA'] or
            not isinstance(repository, dict) or repository.get('full_name') != REPO or repository.get('id') != repository_id or type(repository.get('id')) is not int or
            not isinstance(actor, dict) or actor.get('id') != actor_id or type(actor.get('id')) is not int or actor.get('type') not in ('User', 'Bot') or
            not isinstance(triggering, dict) or triggering.get('id') != actor_id or type(triggering.get('id')) is not int):
        raise GateStop('identity_mismatch')
    source = env.get('SCOUT_TRIGGER_SOURCE', '')
    if record['event'] == 'workflow_dispatch' and source != 'external' and actor['type'] != 'User':
        raise GateStop('manual_actor_rejected')
    if source == 'external' and actor['type'] != 'Bot':
        raise GateStop('external_actor_rejected')
    try:
        created = utc(record.get('created_at'))
    except (ValueError, TypeError):
        raise GateStop('identity_time_rejected') from None
    return {'id': run_id, 'run_attempt': 1, 'repository': REPO, 'workflow': 'reward-snapshots.yml',
            'head_branch': 'main', 'head_sha': record['head_sha'], 'created_at': created,
            'actor_id': actor_id, 'event': record['event'], 'trigger_source': source,
            'collection_slot': env.get('SCOUT_COLLECTION_SLOT', '')}


class GitClaims:
    def __init__(self, root, expected_remote=REMOTE):
        self.root, self.expected_remote = Path(root), expected_remote

    def command(self, *args):
        try:
            result = subprocess.run(['git', *args], cwd=self.root, capture_output=True, timeout=15)
            if result.returncode:
                raise GateStop('git_command_failed')
            return result.stdout
        except (OSError, subprocess.TimeoutExpired):
            raise GateStop('git_unavailable') from None

    def revision(self, ref):
        result = self.command('rev-parse', '--verify', ref).decode().strip()
        if not sha(result):
            raise GateStop('git_revision_rejected')
        return result

    def clean(self):
        if self.command('status', '--porcelain', '--untracked-files=no'):
            raise GateStop('dirty_checkout')

    def remote_main(self):
        # No push retry/rebase/force. Explicit branch prevents a shadowing main tag.
        self.command('fetch', '--no-tags', 'origin', 'refs/heads/main')
        return self.revision('FETCH_HEAD')

    def read(self, run_head):
        remote = self.command('remote', 'get-url', 'origin').decode().strip()
        if remote not in (self.expected_remote, self.expected_remote + '.git'):
            raise GateStop('remote_rejected')
        self.clean()
        base = self.revision('HEAD')
        if base != run_head or self.remote_main() != base:
            raise GateStop('main_advanced_before_claim')
        mode = self.command('ls-tree', base, '--', JOURNAL).decode().split()
        if len(mode) != 4 or mode[0] != '100644' or mode[1] != 'blob' or mode[3] != JOURNAL:
            raise GateStop('journal_missing_or_unsafe')
        size = self.command('cat-file', '-s', base + ':' + JOURNAL).decode().strip()
        if not size.isdigit() or int(size) > MAX_BYTES:
            raise GateStop('journal_oversized')
        raw = self.command('show', base + ':' + JOURNAL)
        target = self.root / JOURNAL
        if target.is_symlink() or target.parent.is_symlink() or not target.is_file() or target.stat().st_size > MAX_BYTES or target.read_bytes() != raw:
            raise GateStop('journal_checkout_mismatch')
        try:
            return base, json.loads(raw)
        except (ValueError, TypeError):
            raise GateStop('invalid_journal') from None

    def publish(self, base, candidate, receipt):
        raw = (json.dumps(candidate, sort_keys=True, separators=(',', ':'), allow_nan=False) + '\n').encode()
        if len(raw) > MAX_BYTES:
            raise GateStop('journal_oversized')
        self.clean()
        if self.revision('HEAD') != base:
            raise GateStop('checkout_advanced')
        target = self.root / JOURNAL
        if target.is_symlink() or target.parent.is_symlink():
            raise GateStop('journal_checkout_mismatch')
        with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as temporary:
            temporary.write(raw)
            name = temporary.name
        os.replace(name, target)
        receipt['candidate_revision'] = 'sha256:' + hashlib.sha256(raw).hexdigest()
        self.command('add', '--', JOURNAL)
        if self.command('diff', '--cached', '--name-only').decode().splitlines() != [JOURNAL] or self.command('diff', '--name-only'):
            raise GateStop('claim_contains_other_changes')
        self.command('-c', 'user.name=scout-data-bot', '-c', 'user.email=scout-data-bot@users.noreply.github.com',
                     'commit', '-m', 'ops: claim collection slot (run ' + str(receipt['run_id']) + ')')
        claim = self.revision('HEAD')
        receipt['claim_commit'] = claim
        parents = self.command('rev-list', '--parents', '-n', '1', claim).decode().split()
        if parents != [claim, base]:
            raise GateStop('claim_parent_mismatch')
        if self.remote_main() != base:
            raise GateStop('main_advanced_before_push')
        receipt['push'] = 'attempted_unknown'
        # Immutable SHA; normal non-fast-forward CAS. Even a success followed by
        # lost response stops closed: never infer acceptance from a later fetch.
        try:
            pushed = self.command('push', '--porcelain', 'origin', claim + ':refs/heads/main')
        except GateStop:
            raise GateStop('claim_push_rejected_or_uncertain') from None
        receipt['push'] = 'success_unconfirmed'
        updates = [line.split('\t') for line in pushed.decode().splitlines() if '\t' in line]
        if len(updates) != 1 or len(updates[0]) != 3 or updates[0][:2] != [' ', claim + ':refs/heads/main']:
            # '=' (up-to-date) is NOT an exclusive CAS. Identical run/time/tree
            # can create an identical Git object in two independent checkouts.
            raise GateStop('claim_push_not_exclusive')
        remote_head = self.remote_main()
        remote_bytes = self.command('show', remote_head + ':' + JOURNAL)
        remote_parents = self.command('rev-list', '--parents', '-n', '1', remote_head).decode().split()
        if (remote_head != claim or remote_parents != [claim, base] or self.revision('HEAD') != claim or
                not publication_authorized(raw, remote_bytes, base, remote_parents[-1])):
            raise GateStop('claim_confirmation_mismatch')
        self.clean()
        receipt['push'] = 'confirmed'
        receipt['confirmed_main'] = remote_head
        return claim


def gate(env, identity_factory, git, now):
    """Pure orchestration seam: tests run real Git, mocked authenticated REST.

    Returns allow/skip/failure and a sanitized receipt. No provider is called here.
    Errors never fall back to the legacy collector when integration is enabled.
    """
    receipt = {'version': 1, 'mode': 'disabled', 'decision': 'unavailable', 'collect': False,
               'checked_at': utc(now()).isoformat().replace('+00:00', 'Z')}
    try:
        setting = env.get('SCOUT_COLLECTION_GATE_ENABLED', '')
        source, slot = env.get('SCOUT_TRIGGER_SOURCE', ''), env.get('SCOUT_COLLECTION_SLOT', '')
        if setting not in ('', 'false', 'true'):
            raise GateStop('invalid_gate_setting')
        if setting != 'true':
            # Do not let the new external entry fall through to the old collector.
            app = env.get('SCOUT_COLLECTION_APP_ACTOR_ID', '')
            if source or slot or (app and env.get('GITHUB_ACTOR_ID') == app):
                raise GateStop('external_entry_disabled')
            receipt.update(decision='legacy_collection_unchanged', collect=True)
            return 0, receipt
        receipt['mode'] = 'enabled'
        app = env.get('SCOUT_COLLECTION_APP_ACTOR_ID', '')
        expected_app = context_id(app) if app else None
        run = authenticate_run(env, identity_factory())
        receipt.update(run_id=run['id'], actor_id=run['actor_id'], event=run['event'], run_head=run['head_sha'],
                       run_created_at=run['created_at'].isoformat().replace('+00:00', 'Z'),
                       run_url='https://github.com/' + REPO + '/actions/runs/' + str(run['id']))
        base, journal = git.read(run['head_sha'])
        decision, candidate = plan_claim(journal, run, now(), expected_app, enabled=True)
        if decision == 'duplicate_suppressed':
            # Planner has validated canonical timing/source before this outcome.
            scheduled = run['created_at'].replace(minute=17, second=0, microsecond=0)
            if scheduled > run['created_at']:
                scheduled -= dt.timedelta(hours=1)
            receipt['slot'] = run['collection_slot'] if run['trigger_source'] == 'external' else slot_key(scheduled)
            receipt['source'] = 'external' if run['trigger_source'] == 'external' else 'native' if run['event'] == 'schedule' else 'manual'
            receipt['decision'] = decision
            return 0, receipt
        if decision != 'claim_candidate_requires_confirmed_push':
            raise GateStop(decision)
        claimed = candidate['claims'][-1]
        receipt.update(slot=claimed['slot'], source=claimed['source'], base_sha=base, claimed_at=claimed['claimed_at'])
        git.publish(base, candidate, receipt)
        # A slow API/push/confirmation must not authorize stale/future collection.
        final = utc(now())
        planned = utc(claimed['slot'].rsplit('|', 1)[1])
        if final < utc(claimed['claimed_at']) or final - planned > MAX_LATE:
            raise GateStop('collection_window_expired_after_claim')
        receipt.update(decision='claim_confirmed', collect=True)
        return 0, receipt
    except GateStop as exc:
        receipt['decision'] = str(exc)
    except Exception:
        receipt['decision'] = 'gate_unavailable'
    return 1, receipt


def write_receipt(path, value):
    # Artifact and output failure must happen BEFORE collect=true is emitted.
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False, mode='w') as temporary:
        json.dump(value, temporary, sort_keys=True, indent=2)
        temporary.write('\n')
        name = temporary.name
    os.replace(name, path)


def main():
    env = os.environ
    root = Path(__file__).resolve().parents[1]
    receipt_path = Path(env.get('RUNNER_TEMP', tempfile.gettempdir())) / 'scout-collection-gate.json'
    # Linux Actions timeout bounds slow streamed API bodies, Git and all claims.
    def deadline(_signum, _frame):
        raise GateStop('gate_deadline_exceeded')
    signal.signal(signal.SIGALRM, deadline)
    signal.alarm(60)
    code, receipt = gate(env, lambda: GitHubIdentity(env.get('GITHUB_TOKEN')), GitClaims(root), lambda: dt.datetime.now(dt.timezone.utc))
    try:
        write_receipt(receipt_path, receipt)
        if env.get('GITHUB_STEP_SUMMARY'):
            with open(env['GITHUB_STEP_SUMMARY'], 'a') as output:
                output.write('## Shared collection gate\n\n```json\n' + json.dumps(receipt, sort_keys=True) + '\n```\n\nA claim is not provider/data persistence proof.\n')
        if env.get('GITHUB_OUTPUT'):
            with open(env['GITHUB_OUTPUT'], 'a') as output:
                output.write('collect=' + ('true' if receipt['collect'] else 'false') + '\n')
        print('Shared collection gate: ' + receipt['decision'])
    except Exception:
        print('Shared collection gate: receipt_or_output_unavailable')
        code = 1
    finally:
        signal.alarm(0)
    return code


if __name__ == '__main__':
    raise SystemExit(main())
