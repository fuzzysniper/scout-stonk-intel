"""Inactive, isolated GITHUB_TOKEN proof. Fixed GETs only. No collector/Git/App imports."""
import datetime as dt
import json
import os
import re
import signal
import sys
import urllib.error
import urllib.request

REPO = 'fuzzysniper/scout-stonk-intel'
REPO_ID = 1415026436
OWNER_ID = 58099771
BRANCH = 'security/c2-workflow-proof'
PATH = '.github/workflows/scout-c2-identity.yml'
COLLECTOR = '.github/workflows/reward-snapshots.yml'
COLLECTOR_ID = 382300817
API = 'https://api.github.com'
MAX_BYTES = 32768


class Stop(Exception):
    pass


def number(value):
    return isinstance(value, str) and re.fullmatch('[1-9][0-9]{0,15}', value) and int(value) <= 9007199254740991


def sha(value):
    return isinstance(value, str) and re.fullmatch('[a-f0-9]{40}', value)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_):
        raise Stop() from None


class Identity:
    def __init__(self, token, run_id, slug, opener=None):
        if not isinstance(token, str) or not token or len(token) > 8192 or any(c in token for c in '\r\n\0'):
            raise Stop()
        self.token = token
        self.paths = {'/actions/workflows/scout-c2-identity.yml', '/actions/runs/' + str(run_id),
                      '/actions/workflows/reward-snapshots.yml', '/users/' + slug + '%5Bbot%5D'}
        self.opener = opener or urllib.request.build_opener(NoRedirect())

    def get(self, path):
        if path not in self.paths:
            raise Stop()
        url = API + (path if path.startswith('/users/') else '/repos/' + REPO + path)
        request = urllib.request.Request(url, method='GET', headers={
            'Authorization': 'Bearer ' + self.token, 'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'SCOUT-C2-Workflow-Identity'})
        try:
            with self.opener.open(request, timeout=5) as response:
                if response.status != 200 or response.geturl() != url:
                    raise Stop()
                data = response.read(MAX_BYTES + 1)
                if len(data) > MAX_BYTES:
                    raise Stop()
                value = json.loads(data.decode('utf-8', errors='strict'))
                if not isinstance(value, dict):
                    raise Stop()
                return value
        except Exception:
            raise Stop() from None


def inspect(env, identity_factory=Identity, now=None):
    checked = now or dt.datetime.now(dt.timezone.utc)
    out = {'version': 1, 'kind': 'stage_c2_workflow_token_identity', 'checkedAt': checked.isoformat().replace('+00:00', 'Z'),
           'passed': False, 'exitCode': 1, 'repositoryId': REPO_ID, 'runId': None, 'workflowId': None,
           'collectorWorkflowId': COLLECTOR_ID, 'ownerActorId': OWNER_ID, 'appActorId': None,
           'collectionGuardUnset': False, 'collectionGuardExplicitFalse': False,
           'isolatedWorkflowTokenIdentityVerified': False, 'collectorWorkflowTokenVerified': False,
           'hostedBindingVerified': False, 'pilotReady': False,
           'dispatches': 0, 'collectionClaims': 0, 'providerQueries': 0, 'repositoryWrites': 0}
    try:
        # Closed proof context, BEFORE accessing GITHUB_TOKEN or creating a client.
        if (env.get('SCOUT_C2_PROOF_ENABLED') != 'true' or env.get('SCOUT_COLLECTION_GATE_ENABLED', '') not in ('', 'false') or
                env.get('SCOUT_COLLECTION_SLOT', '') or env.get('SCOUT_TRIGGER_SOURCE', '') or
                env.get('GITHUB_ACTIONS') != 'true' or env.get('RUNNER_ENVIRONMENT') != 'github-hosted' or env.get('RUNNER_OS') != 'Linux' or
                env.get('GITHUB_REPOSITORY') != REPO or env.get('GITHUB_REPOSITORY_ID') != str(REPO_ID) or
                env.get('GITHUB_REF') != 'refs/heads/' + BRANCH or env.get('GITHUB_EVENT_NAME') != 'push' or
                env.get('GITHUB_JOB') != 'identity-only' or env.get('GITHUB_WORKFLOW_REF') != REPO + '/' + PATH + '@refs/heads/' + BRANCH or
                env.get('GITHUB_ACTOR') != 'fuzzysniper' or env.get('GITHUB_ACTOR_ID') != str(OWNER_ID) or env.get('GITHUB_RUN_ATTEMPT') != '1' or
                not sha(env.get('GITHUB_SHA')) or env.get('GITHUB_WORKFLOW_SHA') != env.get('GITHUB_SHA') or
                env.get('SCOUT_C2_APPROVED_SHA') != env.get('GITHUB_SHA') or not number(env.get('GITHUB_RUN_ID')) or
                not number(env.get('SCOUT_COLLECTION_APP_ACTOR_ID')) or
                env.get('C2_EXPECTED_APP_ACTOR_ID') != env.get('SCOUT_COLLECTION_APP_ACTOR_ID') or
                int(env['SCOUT_COLLECTION_APP_ACTOR_ID']) in (OWNER_ID, REPO_ID, 5310753, 171233795) or
                not re.fullmatch('[a-z0-9-]{1,100}', env.get('C2_APP_SLUG', '')) or
                any(k in env for k in ('APP_PRIVATE_KEY', 'SCOUT_APP_PRIVATE_KEY', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_GLOBAL_API_KEY', 'GH_TOKEN'))):
            raise Stop()
        run_id, actor_id = int(env['GITHUB_RUN_ID']), int(env['SCOUT_COLLECTION_APP_ACTOR_ID'])
        client = identity_factory(env.get('GITHUB_TOKEN'), run_id, env['C2_APP_SLUG'])
        workflow = client.get('/actions/workflows/scout-c2-identity.yml')
        run = client.get('/actions/runs/' + str(run_id))
        collector = client.get('/actions/workflows/reward-snapshots.yml')
        bot = client.get('/users/' + env['C2_APP_SLUG'] + '%5Bbot%5D')
        if (type(workflow.get('id')) is not int or workflow['id'] <= 0 or workflow.get('path') != PATH or workflow.get('state') != 'active' or
                run.get('id') != run_id or type(run.get('id')) is not int or type(run.get('workflow_id')) is not int or run.get('workflow_id') != workflow['id'] or
                run.get('path') != PATH or type(run.get('run_attempt')) is not int or run.get('run_attempt') != 1 or
                run.get('event') != 'push' or run.get('head_branch') != BRANCH or run.get('head_sha') != env['GITHUB_SHA'] or
                run.get('status') != 'in_progress' or run.get('conclusion') is not None or
                run.get('repository', {}).get('full_name') != REPO or type(run.get('repository', {}).get('id')) is not int or run['repository']['id'] != REPO_ID or
                any(run.get(k, {}).get('id') != OWNER_ID or type(run.get(k, {}).get('id')) is not int or run.get(k, {}).get('login') != 'fuzzysniper' or run.get(k, {}).get('type') != 'User' for k in ('actor', 'triggering_actor')) or
                type(collector.get('id')) is not int or collector.get('id') != COLLECTOR_ID or collector.get('path') != COLLECTOR or collector.get('state') != 'active' or
                type(bot.get('id')) is not int or bot.get('id') != actor_id or bot.get('type') != 'Bot' or bot.get('login') != env['C2_APP_SLUG'] + '[bot]'):
            raise Stop()
        created = dt.datetime.fromisoformat(run['created_at'].replace('Z', '+00:00'))
        if created.utcoffset() != dt.timedelta(0) or not 0 <= (checked-created).total_seconds() <= 120:
            raise Stop()
        out.update(passed=True, exitCode=0, runId=run_id, workflowId=workflow['id'], appActorId=actor_id,
                   isolatedWorkflowTokenIdentityVerified=True,
                   collectionGuardUnset=env.get('SCOUT_COLLECTION_GATE_ENABLED', '') == '',
                   collectionGuardExplicitFalse=env.get('SCOUT_COLLECTION_GATE_ENABLED') == 'false')
    except Exception:
        pass  # No API body/header/token, exception/traceback, arbitrary input or env leaves.
    return out


def main():
    if sys.argv[1:] != ['--approved-identity-only']:
        print(json.dumps({'passed': False, 'exitCode': 1, 'pilotReady': False}))
        return 1
    # Linux-only isolated Actions job. A single overall deadline also bounds reads.
    if os.name != 'posix' or not hasattr(signal, 'setitimer'):
        return 1
    def deadline(*_):
        raise Stop() from None
    signal.signal(signal.SIGALRM, deadline)
    signal.setitimer(signal.ITIMER_REAL, 25)
    try:
        result = inspect(os.environ)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
    print(json.dumps(result, separators=(',', ':')))
    return result['exitCode']


if __name__ == '__main__':
    sys.exit(main())
