"""INACTIVE actual jobs.collect token proof; used only by an unapplied proposal.

Reuses the production gate's authenticated identity validation, never gate(),
GitClaims, collection, subprocesses or provider access. No fallback credentials.
"""
import datetime as dt
import json
import os
import signal
import sys

from scripts.collection_gate import GitHubIdentity, GateStop, authenticate_run, context_id, sha
from scripts.trigger_contract import utc

REPO = 'fuzzysniper/scout-stonk-intel'
REPO_ID = 1415026436
OWNER_ID = 58099771
APP_ACTOR_ID = 342326617
WORKFLOW_ID = 382300817
WORKFLOW_PATH = '.github/workflows/reward-snapshots.yml'
PROOF_STEP = 'Read-only collector token proof'
TRANSPORT_REASONS = frozenset({'identity_token_missing', 'identity_path_rejected', 'identity_read_unauthorized',
                               'identity_read_forbidden', 'identity_response_rejected', 'identity_response_oversized',
                               'identity_redirect_rejected', 'identity_unavailable', 'proof_deadline_exceeded'})


class Identity(GitHubIdentity):
    """Same authenticated transport/limits as the real gate, three fixed GETs."""
    def __init__(self, token, run_id, opener=None):
        if not isinstance(token, str) or any(c in token for c in '\r\n\0'):
            raise GateStop('identity_token_missing')
        context_id(str(run_id))
        super().__init__(token, opener)
        self.paths = {'/actions/workflows/reward-snapshots.yml', '/actions/runs/' + str(run_id),
                      '/actions/runs/' + str(run_id) + '/attempts/1/jobs?per_page=2'}

    def get(self, path):
        if path not in self.paths:
            raise GateStop('identity_path_rejected')
        return super().get(path)


def inspect(env, identity_factory=Identity, now=None):
    checked = now or dt.datetime.now(dt.timezone.utc)
    out = {'version': 1, 'kind': 'stage_c2_actual_collector_token',
           'checkedAt': checked.isoformat().replace('+00:00', 'Z'), 'passed': False, 'exitCode': 1, 'reason': 'proof_context_rejected',
           'repositoryId': REPO_ID, 'workflowId': WORKFLOW_ID, 'appActorId': APP_ACTOR_ID,
           'runId': None, 'jobId': None, 'runAttempt': None, 'headSha': None,
           'collectionGateAbsentAttested': False, 'collectorWorkflowTokenVerified': False,
           'gitClaimVerified': False, 'hostedBindingVerified': False, 'pilotReady': False,
           'dispatches': 0, 'collectionClaims': 0, 'providerQueries': 0, 'repositoryWrites': 0}
    try:
        # Every context/approval guard runs before reading the ephemeral token.
        if (env.get('SCOUT_C2_COLLECTOR_PROOF') != 'auth-only' or
                env.get('SCOUT_C2_GATE_ABSENT_ATTESTED') != 'true' or
                env.get('SCOUT_COLLECTION_GATE_ENABLED', '') != '' or
                env.get('SCOUT_COLLECTION_APP_ACTOR_ID') != str(APP_ACTOR_ID) or
                env.get('SCOUT_COLLECTION_SLOT', '') or env.get('SCOUT_TRIGGER_SOURCE', '') or
                env.get('GITHUB_ACTIONS') != 'true' or env.get('RUNNER_ENVIRONMENT') != 'github-hosted' or
                env.get('RUNNER_OS') != 'Linux' or env.get('GITHUB_JOB') != 'collect' or
                env.get('GITHUB_REPOSITORY') != REPO or env.get('GITHUB_REPOSITORY_ID') != str(REPO_ID) or
                env.get('GITHUB_EVENT_NAME') != 'schedule' or env.get('GITHUB_REF') != 'refs/heads/main' or
                env.get('GITHUB_WORKFLOW_REF') != REPO + '/' + WORKFLOW_PATH + '@refs/heads/main' or
                env.get('GITHUB_ACTOR') != 'fuzzysniper' or env.get('GITHUB_ACTOR_ID') != str(OWNER_ID) or
                env.get('GITHUB_RUN_ATTEMPT') != '1' or not sha(env.get('GITHUB_SHA')) or
                env.get('GITHUB_WORKFLOW_SHA') != env.get('GITHUB_SHA') or
                env.get('SCOUT_C2_COLLECTOR_APPROVED_SHA') != env.get('GITHUB_SHA') or
                any(k in env for k in ('APP_PRIVATE_KEY', 'SCOUT_APP_PRIVATE_KEY', 'CLOUDFLARE_API_TOKEN',
                                      'CLOUDFLARE_GLOBAL_API_KEY', 'GH_TOKEN'))):
            raise GateStop('proof_context_rejected')
        out['reason'] = 'proof_window_rejected'
        start = utc(env.get('SCOUT_C2_COLLECTOR_NOT_BEFORE'))
        end = utc(env.get('SCOUT_C2_COLLECTOR_EXPIRES_AT'))
        if (not 0 < (end-start).total_seconds() <= 86400 or not start <= checked < end or
                checked.utcoffset() != dt.timedelta(0)):
            raise GateStop('proof_window_rejected')
        out['reason'] = 'proof_identity_unverified'
        run_id = context_id(env.get('GITHUB_RUN_ID'))
        client = identity_factory(env.get('GITHUB_TOKEN'), run_id)
        seen = {}

        class Recorded:
            def get(self, path):
                seen[path] = client.get(path)
                return seen[path]

        # Exactly the same two identity reads and production validation as gate.
        run = authenticate_run(env, Recorded())
        workflow = seen['/actions/workflows/reward-snapshots.yml']
        record = seen['/actions/runs/' + str(run_id)]
        if (type(workflow.get('id')) is not int or workflow['id'] != WORKFLOW_ID or
                not start <= run['created_at'] < end or not 0 <= (checked-run['created_at']).total_seconds() <= 120 or
                any(record.get(k, {}).get('login') != 'fuzzysniper' or record.get(k, {}).get('type') != 'User'
                    for k in ('actor', 'triggering_actor'))):
            raise GateStop('proof_identity_rejected')
        out['reason'] = 'proof_job_unverified'
        jobs = client.get('/actions/runs/' + str(run_id) + '/attempts/1/jobs?per_page=2')
        if type(jobs.get('total_count')) is not int or jobs['total_count'] != 1 or not isinstance(jobs.get('jobs'), list) or len(jobs['jobs']) != 1:
            raise GateStop('proof_job_rejected')
        job = jobs['jobs'][0]
        if (type(job.get('id')) is not int or not 0 < job['id'] <= 2**53-1 or
                type(job.get('run_id')) is not int or job['run_id'] != run_id or
                job.get('name') != 'collect' or job.get('head_sha') != env['GITHUB_SHA'] or
                job.get('status') != 'in_progress' or job.get('conclusion') is not None or
                not isinstance(job.get('steps'), list)):
            raise GateStop('proof_job_rejected')
        running = [step for step in job['steps'] if step.get('status') == 'in_progress']
        if (len(running) != 1 or running[0].get('name') != PROOF_STEP or
                running[0].get('conclusion') is not None or type(running[0].get('number')) is not int or running[0]['number'] <= 0):
            raise GateStop('proof_step_rejected')
        out.update(passed=True, exitCode=0, reason='verified', runId=run_id, jobId=job['id'], runAttempt=1,
                   headSha=run['head_sha'], collectionGateAbsentAttested=True, collectorWorkflowTokenVerified=True)
    except GateStop as error:
        if str(error) in TRANSPORT_REASONS:
            out['reason'] = str(error)
    except Exception:
        pass  # Only fixed schema leaves; no raw exceptions, HTTP bodies or token.
    return out


def main():
    if sys.argv[1:] != ['--approved-collector-identity-only']:
        print(json.dumps({'passed': False, 'exitCode': 1, 'pilotReady': False}))
        return 1
    if os.name != 'posix' or not hasattr(signal, 'setitimer'):
        print(json.dumps({'passed': False, 'exitCode': 1, 'pilotReady': False}))
        return 1

    def deadline(*_):
        raise GateStop('proof_deadline_exceeded')

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
