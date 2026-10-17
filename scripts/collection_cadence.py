#!/usr/bin/env python3
"""Explicit offline audit of recorded Actions evidence against pinned local Git.

No network, credential reads, collection, dispatch, Git fetch/push or file writes.
Only timing/status/hash metadata is emitted. Capture provenance is trusted input,
not a cryptographic attestation from GitHub. Never a financial eligibility gate.
"""
import argparse
import datetime as dt
import hashlib
import json
import math
import os
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKFLOW = '.github/workflows/reward-snapshots.yml'
SNAPSHOT = 'data/reward-snapshots.json'
SUMMARY = 'data/collection-summary.json'
ALLOWLIST = 'data/tracked-mints.json'
MAX_INPUT = 1024 * 1024
MAX_GIT_BYTES = 2 * 1024 * 1024
MAX_RUNS = 100
FAILURE_CODES = frozenset(('provider_not_found','provider_rate_limited','http_error','network_timeout',
                          'network_error','invalid_json','source_redirect','oversized_response',
                          'mint_mode_mismatch','quote_mismatch','invalid_counter','invalid_provider_time',
                          'stale_provider','invalid_storage','out_of_order','unexpected_error'))


def utc(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)', value):
        raise ValueError('invalid_time')
    return dt.datetime.fromisoformat(value.replace('Z', '+00:00'))


def sha(value):
    return isinstance(value, str) and re.fullmatch('[a-f0-9]{40}', value) is not None


def digest(raw):
    return 'sha256:' + hashlib.sha256(raw).hexdigest()


def slot(at):
    prior = at.replace(minute=17, second=0, microsecond=0)
    return prior if prior <= at else prior - dt.timedelta(hours=1)


def iso(at):
    return at.isoformat().replace('+00:00', 'Z')


class LocalGit:
    """Fixed read-only plumbing; no caller-supplied paths, refs, remotes or shell."""
    def __init__(self, root=ROOT):
        self.root = root
        self.cache = {}
        self.remaining = 16 * 1024 * 1024
        # Missing objects must not trigger a partial clone's implicit network
        # fetch or inherit App/cloud/token/profile variables from an operator.
        self.environment = {'PATH': os.environ.get('PATH', os.defpath),
                            'GIT_NO_LAZY_FETCH': '1', 'GIT_TERMINAL_PROMPT': '0',
                            'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': os.devnull,
                            'GIT_OPTIONAL_LOCKS': '0'}
        if 'SystemRoot' in os.environ:
            self.environment['SystemRoot'] = os.environ['SystemRoot']

    def command(self, *args):
        r = subprocess.run(['git', '--no-replace-objects', *args], cwd=self.root, env=self.environment,
                           capture_output=True, timeout=10)
        if r.returncode or len(r.stdout) > MAX_GIT_BYTES:
            raise ValueError('git_evidence_unavailable')
        return r.stdout

    def read(self, commit, path):
        if not sha(commit) or path not in (SNAPSHOT, SUMMARY, ALLOWLIST):
            raise ValueError('invalid_git_selector')
        key = (commit, path)
        if key in self.cache:
            return self.cache[key]
        size = self.command('cat-file', '-s', commit + ':' + path).decode().strip()
        if not size.isdigit() or int(size) > min(MAX_GIT_BYTES, self.remaining):
            raise ValueError('git_evidence_oversized')
        raw = self.command('show', commit + ':' + path)
        self.remaining -= len(raw)
        self.cache[key] = raw
        return raw

    def parents(self, commit):
        if not sha(commit):
            raise ValueError('invalid_git_selector')
        return self.command('show', '-s', '--format=%P', commit).decode().split()

    def reachable(self, commit, main):
        if not sha(commit) or not sha(main):
            raise ValueError('invalid_git_selector')
        r = subprocess.run(['git', '--no-replace-objects', 'merge-base', '--is-ancestor', commit, main], cwd=self.root, env=self.environment,
                           capture_output=True, timeout=10)
        if r.returncode not in (0, 1):
            raise ValueError('git_evidence_unavailable')
        return r.returncode == 0


def proof(run, jobs, commits, main, tokens, git, now):
    out = {'runId': run['id'], 'attempt': run['run_attempt'], 'event': run['event'],
           'createdAt': run['created_at'], 'state': 'unconfirmed', 'commit': None,
           'collected': None, 'failed': None, 'skipped': None, 'observations': []}
    if run['run_attempt'] != 1:
        return {**out, 'state': 'rerun_attempt_unverifiable'}
    if not jobs or jobs.get('total_count') != len(jobs.get('jobs', [])) or len(jobs['jobs']) != 1:
        return {**out, 'state': 'job_evidence_unavailable'}
    job = jobs['jobs'][0]
    if (job.get('run_id') != run['id'] or job.get('run_attempt') != 1 or job.get('head_sha') != run['head_sha']
            or job.get('name') != 'collect' or job.get('status') != 'completed' or
            len(job.get('steps', [])) > 30 or utc(job['completed_at']) > now):
        return {**out, 'state': 'job_identity_mismatch'}
    out['queueSeconds'] = (utc(job['started_at']) - utc(run['created_at'])).total_seconds()
    steps = {s['name']: s for s in job['steps']}
    if len(steps) != len(job['steps']):
        return {**out, 'state': 'job_identity_mismatch'}
    collect = steps.get('Collect observations')
    persist = steps.get('Persist observations and summary')
    out['gateStep'] = steps.get('Shared claim gate (default off)', {}).get('conclusion')
    out['collectionStep'] = collect.get('conclusion') if collect else None
    out['persistStep'] = persist.get('conclusion') if persist else None
    if collect and collect.get('conclusion') == 'skipped':
        return {**out, 'state': 'collection_skipped', 'collected': 0}
    if not collect or not persist:
        return {**out, 'state': 'job_evidence_unavailable'}
    if persist.get('conclusion') != 'success':
        return {**out, 'state': 'persistence_failed_or_uncertain'}
    matches = []
    for commit in commits:
        try:
            summary = json.loads(git.read(commit['sha'], SUMMARY))
        except (ValueError, KeyError):
            continue
        if isinstance(summary, dict) and summary.get('runId') == run['id']:
            matches.append((commit, summary))
    if len(matches) != 1:
        return {**out, 'state': 'summary_missing_or_ambiguous'}
    commit, summary = matches[0]
    try:
        start, end = utc(summary['startedAt']), utc(summary['finishedAt'])
        if (summary.get('version') != 1 or summary.get('event') != run['event'] or
                not utc(collect['started_at']) <= start <= end <= utc(collect['completed_at']) <= now or
                not utc(persist['started_at']) <= utc(commit['committedAt']) <= utc(persist['completed_at']) or
                not git.reachable(commit['sha'], main)):
            raise ValueError()
        parents = git.parents(commit['sha'])
        if parents != commit['parents'] or len(parents) != 1:
            raise ValueError()
        raw = git.read(commit['sha'], SNAPSHOT)
        if digest(raw) != summary.get('expectedDatasetRevision'):
            raise ValueError()
        after, before = json.loads(raw), json.loads(git.read(parents[0], SNAPSHOT))
        results = summary['results']
        if len(results) != len(tokens) or {r['mint'] for r in results} != set(tokens):
            raise ValueError()
        counts = {k: sum(r['status'] == k for r in results) for k in ('collected', 'failed', 'skipped')}
        if sum(counts.values()) != len(tokens):
            raise ValueError()
        observed, expected_store, failures = [], dict(before), {}
        for result in results:
            if result['status'] != 'collected':
                if result.get('observedAt') is not None:
                    raise ValueError()
                if result['status'] == 'failed':
                    code = result.get('reason')
                    code = code if code in FAILURE_CODES else 'unclassified_collection_failure'
                    failures[code] = failures.get(code, 0) + 1
                continue
            mint, token = result['mint'], tokens[result['mint']]
            at = utc(result['observedAt'])
            hits = [r for r in after[mint] if utc(r['observedAt']) == at]
            if len(hits) != 1 or any(utc(r['observedAt']) == at for r in before.get(mint, [])) or not start <= at <= end:
                raise ValueError()
            r = hits[0]
            if r.get('quoteMint') != token['quoteMint'] or r.get('quoteSymbol') != token['quoteSymbol'] or r.get('source') != token['source']:
                raise ValueError()
            counter = r.get('distributedTokens')
            if type(counter) not in (int, float) or not math.isfinite(counter) or counter < 0:
                raise ValueError()
            generated = utc(r['providerGeneratedAt'])
            lag = (at - generated).total_seconds()
            if not -60 <= lag <= 10800 or r.get('mode') != 'reward':
                raise ValueError()
            expected_store[mint] = (before.get(mint, []) + [r])[-193:]
            observed.append({'mint': mint, 'observedAt': r['observedAt'],
                             'providerGeneratedAt': r['providerGeneratedAt'], 'providerLagSeconds': lag})
        expected = 'complete' if counts['collected'] == len(tokens) else 'partial' if counts['collected'] else 'failed' if counts['failed'] else 'skipped'
        if summary.get('overall') != expected:
            raise ValueError()
        if collect['conclusion'] != ('failure' if expected == 'failed' else 'success'):
            raise ValueError()
        if after != expected_store:
            raise ValueError()
        return {**out, 'state': 'verified_persistence', 'commit': commit['sha'],
                'baseMatchesRunHead': parents[0] == run['head_sha'], 'datasetRevision': digest(raw),
                **counts, 'failureReasons': failures, 'observations': observed}
    except (ValueError, TypeError, KeyError, OverflowError, AttributeError, IndexError):
        return {**out, 'state': 'persistence_evidence_mismatch'}


def analyze(bundle, git):
    if bundle.get('schemaVersion') != 1 or not sha(bundle.get('mainSha')):
        raise ValueError('invalid_bundle')
    now, activated = utc(bundle['asOf']), utc(bundle['workflow']['created_at'])
    page, commits = bundle['runs'], bundle['commits']
    rows = page['workflow_runs']
    if not isinstance(rows, list) or len(rows) > MAX_RUNS or len(commits) > MAX_RUNS:
        raise ValueError('input_limit')
    if len({c['sha'] for c in commits}) != len(commits) or any(not sha(c['sha']) for c in commits):
        raise ValueError('invalid_commit_list')
    if any(type(r['id']) is not int or r['id'] <= 0 or type(r['run_attempt']) is not int or r['run_attempt'] < 1 or not sha(r['head_sha']) for r in rows):
        raise ValueError('invalid_run')
    times = [utc(r['created_at']) for r in rows]
    identity_ok = all(r.get('path') == WORKFLOW and r.get('head_branch') == 'main' and
                      r.get('workflow_id') == bundle['workflow']['id'] for r in rows)
    complete = (identity_ok and type(page['total_count']) is int and page['total_count'] >= len(rows) and
                len({r['id'] for r in rows}) == len(rows) and times == sorted(times, reverse=True) and
                (page['total_count'] == len(rows) or bool(times) and times[-1] <= max(activated, now-dt.timedelta(hours=48))))
    if any(t > now for t in times) or activated > now:
        raise ValueError('future_evidence')
    all_tokens = json.loads(git.read(bundle['mainSha'], ALLOWLIST))
    tokens = {t['mint']: t for t in all_tokens}
    if not 1 <= len(tokens) <= 10 or len(tokens) != len(all_tokens):
        raise ValueError('invalid_allowlist')
    snapshot_raw = git.read(bundle['mainSha'], SNAPSHOT)
    snapshot = json.loads(snapshot_raw)
    if not isinstance(snapshot, dict) or len(snapshot) > 10:
        raise ValueError('invalid_snapshot')
    for stored in snapshot.values():
        if not isinstance(stored, list) or len(stored) > 193:
            raise ValueError('invalid_snapshot')
        observed = [utc(r['observedAt']) for r in stored]
        if any(t > now for t in observed) or any(a >= b for a,b in zip(observed, observed[1:])):
            raise ValueError('invalid_snapshot_clock')
    unique = {}
    conflicts = set()
    for r in rows:
        if r['id'] in unique and unique[r['id']] != r:
            conflicts.add(r['id'])
        unique[r['id']] = r
    eligible = [r for r in unique.values() if r['id'] not in conflicts and r.get('path') == WORKFLOW and r.get('head_branch') == 'main' and
                r.get('workflow_id') == bundle['workflow']['id'] and r.get('event') in ('schedule', 'workflow_dispatch')]
    recent = [r for r in eligible if now-dt.timedelta(hours=48) <= utc(r['created_at']) <= now]
    proofs = [proof(r, bundle['jobs'].get(str(r['id'])), commits, bundle['mainSha'], tokens, git, now) for r in recent]
    windows = []
    for hours in (24, 48):
        start = max(activated, now-dt.timedelta(hours=hours))
        first = slot(start)
        if first < start:
            first += dt.timedelta(hours=1)
        slots = []
        while first < now:
            slots.append(first)
            first += dt.timedelta(hours=1)
        mature = {s for s in slots if s+dt.timedelta(minutes=15) <= now}
        scheduled = [r for r in recent if r['event'] == 'schedule' and utc(r['created_at']) >= start]
        dispatched = [r for r in recent if r['event'] == 'workflow_dispatch' and utc(r['created_at']) >= start]
        created = {slot(utc(r['created_at'])) for r in scheduled}
        verified = [p for p in proofs if p['state'] == 'verified_persistence' and utc(p['createdAt']) >= start]
        failures = {}
        for p in verified:
            for reason, count in p['failureReasons'].items():
                failures[reason] = failures.get(reason, 0) + count
        def bucket_coverage(observations):
            return len(mature & {slot(utc(o['observedAt'])) for o in observations})
        per_token = []
        for mint in tokens:
            actual = [r for r in snapshot.get(mint, []) if start <= utc(r['observedAt']) <= now]
            source_times = [utc(r['observedAt']) for r in actual]
            per_token.append({'mint': mint, 'storedPointsInWindow': len(actual), 'matureObservationBuckets': bucket_coverage(actual),
                              'verifiedRunBuckets': bucket_coverage([o for p in verified for o in p['observations'] if o['mint'] == mint]),
                              'startToFirstObservationSeconds': (source_times[0]-start).total_seconds() if source_times else None,
                              'lastObservationToEndSeconds': (now-source_times[-1]).total_seconds() if source_times else None,
                              'maxObservedGapSecondsInWindow': max(((b-a).total_seconds() for a,b in zip(source_times, source_times[1:])), default=None)})
        windows.append({'hours': hours, 'startAt': iso(start), 'nominalSlots': len(slots), 'matureSlots': len(mature),
                        'scheduledRunsCreated': len(scheduled), 'workflowDispatchRunsCreated': len(dispatched),
                        'matureCreationBuckets': len(mature & created),
                        'matureBucketsWithoutScheduledCreation': len(mature-created) if complete else None,
                        'withoutScheduledCreation': [iso(s) for s in sorted(mature-created)] if complete else None,
                        'verifiedDataRuns': len([p for p in verified if p['collected']]),
                        'runProofComplete': complete and all(p['state'] in ('verified_persistence','collection_skipped') for p in proofs if utc(p['createdAt']) >= start),
                        'verifiedCollectionFailures': sum(p['failed'] for p in verified), 'failureReasons': failures, 'tokens': per_token})
    latest = []
    for mint in tokens:
        rows_for_token = snapshot.get(mint, [])
        latest_row = rows_for_token[-1] if rows_for_token else None
        latest.append({'mint': mint, 'points': len(rows_for_token), 'observedAt': latest_row.get('observedAt') if latest_row else None,
                       'providerGeneratedAt': latest_row.get('providerGeneratedAt') if latest_row else None,
                       'providerAgeSeconds': (now-utc(latest_row['providerGeneratedAt'])).total_seconds() if latest_row and latest_row.get('providerGeneratedAt') else None,
                       'observationAgeSeconds': (now-utc(latest_row['observedAt'])).total_seconds() if latest_row else None})
    return {'schemaVersion': 1, 'kind': 'offline_collection_cadence', 'asOf': bundle['asOf'], 'mainSha': bundle['mainSha'],
            'listingCompleteForWindow': complete, 'intendedSlotsKnown': False, 'pilotDecision': 'no_go',
            'datasetRevision': digest(snapshot_raw), 'windows': windows, 'runEvidence': proofs, 'latest': latest,
            'limitations': ['Creation buckets do not identify GitHub intended/dropped schedules.',
                            'Verified observations are source captures, not payout timestamps or financial eligibility.',
                            'Unconfirmed/failed evidence is not zero; incomplete listing withholds absent-run counts.',
                            'Summary reuse, rerun attempts and gate-skipped collection cannot prove fresh persistence.',
                            'Git-confirmed persistence does not prove public application serving or 48-hour reliability.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('recorded_bundle', type=pathlib.Path)
    args = parser.parse_args()
    try:
        with args.recorded_bundle.open('rb') as f:
            raw = f.read(MAX_INPUT+1)
        if len(raw) > MAX_INPUT:
            raise ValueError('input_limit')
        result = analyze(json.loads(raw), LocalGit())
        print(json.dumps(result, indent=2, allow_nan=False))
    except (ValueError, KeyError, TypeError, OSError, subprocess.SubprocessError, OverflowError, AttributeError, IndexError):
        print(json.dumps({'state': 'unavailable', 'reason': 'recorded_evidence_invalid_or_unavailable', 'pilotDecision': 'no_go'}))
        raise SystemExit(2)


if __name__ == '__main__':
    main()
