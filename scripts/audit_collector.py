#!/usr/bin/env python3
"""Read-only GitHub/observation audit; sanitized output, no dispatch, secrets or market alerts."""
import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import urllib.request
from collect_rewards import load_mints, timestamp, amount

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = 'fuzzysniper/scout-stonk-intel'
API = 'https://api.github.com/repos/' + REPO
MAX_API_BYTES = 1024 * 1024
MAX_DATA_BYTES = 2 * 1024 * 1024
MAX_RECENT_RUNS = 48
SCHEDULE_MINUTE = 17
SCHEDULE_GRACE = dt.timedelta(minutes=15)


def recent_cadence(page, now, activated_at):
    """Creation-time evidence, not attribution to intended/dropped cron events or persistence proof."""
    start = max(now - dt.timedelta(hours=24), timestamp(activated_at))
    if start > now:
        raise ValueError('future_workflow_time')
    slot = start.replace(minute=SCHEDULE_MINUTE, second=0, microsecond=0)
    if slot < start:
        slot += dt.timedelta(hours=1)
    slots = []
    while slot < now:
        slots.append(slot)
        slot += dt.timedelta(hours=1)
    mature = {slot for slot in slots if slot + SCHEDULE_GRACE <= now}
    rows, total = page['workflow_runs'], page['total_count']
    if not isinstance(rows, list) or len(rows) > MAX_RECENT_RUNS or type(total) is not int or total < len(rows):
        raise ValueError('invalid_run_page')
    times = [timestamp(row['created_at']) for row in rows]
    if any(at > now for at in times):
        raise ValueError('future_run_time')
    ids = [row['id'] for row in rows]
    if any(type(rid) is not int or rid <= 0 for rid in ids):
        raise ValueError('invalid_run_id')
    # A full history or a descending page reaching the window boundary proves the window was covered.
    complete = len(set(ids)) == len(ids) and times == sorted(times, reverse=True) and (
        total == len(rows) or bool(times) and times[-1] <= start)
    scheduled, manual, observed_slots, offsets = [], [], set(), []
    for row, created in zip(rows, times):
        if not start <= created < now or row.get('head_branch') != 'main' or row.get('path', '').split('@')[0] != '.github/workflows/reward-snapshots.yml':
            continue
        if row.get('event') == 'workflow_dispatch':
            manual.append(row['id'])
        elif row.get('event') == 'schedule':
            scheduled.append(row['id'])
            prior = created.replace(minute=SCHEDULE_MINUTE, second=0, microsecond=0)
            if prior > created:
                prior -= dt.timedelta(hours=1)
            observed_slots.add(prior)
            offsets.append({'id': row['id'], 'secondsAfterPriorSlot': int((created - prior).total_seconds())})
    return {'state': 'checked' if complete else 'incomplete', 'windowStart': start.isoformat(timespec='seconds'),
            'windowEnd': now.isoformat(timespec='seconds'), 'nominalSlots': len(slots), 'matureSlots': len(mature),
            'graceSeconds': int(SCHEDULE_GRACE.total_seconds()), 'listedScheduledRuns': len(set(scheduled)),
            'listedManualRuns': len(set(manual)),
            'matureSlotsWithoutRunCreation': len(mature - observed_slots) if complete else None,
            'creationOffsets': offsets, 'intendedSlotsKnown': False}


def cadence_summary(cadence):
    if cadence.get('state') not in ('checked', 'incomplete'):
        return 'Recent cadence: unavailable; API failure is not zero execution.\n'
    absent = cadence['matureSlotsWithoutRunCreation']
    return ('## Recent collector cadence (creation-time evidence)\n\n'
            + cadence['windowStart'] + ' to ' + cadence['windowEnd'] + ' UTC\n\n'
            + 'Nominal hourly opportunities: ' + str(cadence['nominalSlots']) + '; past 15-minute grace: ' + str(cadence['matureSlots']) + '.\n\n'
            + 'Listed scheduled runs: ' + str(cadence['listedScheduledRuns']) + '; manual runs: ' + str(cadence['listedManualRuns']) + '.\n\n'
            + ('Mature opportunities without run creation in their hourly bucket: ' + str(absent) if absent is not None else 'Run page incomplete: missing-opportunity count unknown; listed run counts are lower bounds') + '.\n\n'
            + 'GitHub can delay/drop schedules. Creation buckets do not identify intended slots or prove dropped jobs. '
            + 'Run success is not provider/commit proof; verify summaries, remote commits and exact snapshot hashes. '
            + 'This audit cannot report if its own scheduler never runs.\n')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('unexpected_redirect')


def get(url, token=None, limit=MAX_API_BYTES):
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'SCOUT-Data-Health/1.0'}
    if token and url.startswith(API + '/'):
        headers['Authorization'] = 'Bearer ' + token
    with urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(url, headers=headers), timeout=8) as response:
        if response.geturl() != url:
            raise ValueError('unexpected_redirect')
        body = response.read(limit + 1)
        if len(body) > limit:
            raise ValueError('oversized_response')
        return body


def summarize_runs(runs, jobs=None):
    clean = []
    for row in runs[:12]:
        if row.get('head_branch') != 'main' or row.get('event') not in ('schedule', 'workflow_dispatch'):
            continue
        if row.get('path', '').split('@')[0] != '.github/workflows/reward-snapshots.yml':
            continue
        clean.append({key: row[key] for key in ('id', 'event', 'status', 'conclusion')})
        clean[-1].update({'createdAt': row['created_at'], 'updatedAt': row['updated_at'], 'collectionStep': None, 'commitStep': None})
    if jobs and clean:
        steps = [step for job in jobs.get('jobs', [])[:3] for step in job.get('steps', [])[:20]]
        for step in steps:
            if step.get('name') in ('Collect observations', 'Run python scripts/collect_rewards.py'):
                clean[0]['collectionStep'] = step.get('conclusion')
            if step.get('name') in ('Persist observations and summary', 'Commit observed data'):
                clean[0]['commitStep'] = step.get('conclusion')
    return clean


def data_failure(store, tokens, now):
    # Operational alert threshold: six hours, with no reward/price/momentum condition.
    if not isinstance(store, dict):
        return True
    for token in tokens:
        valid = []
        rows = store.get(token['mint'], [])
        if not isinstance(rows, list):
            return True
        for row in rows:
            try:
                if not isinstance(row, dict) or not amount(row.get('distributedTokens')) or row.get('quoteMint') != token['quoteMint'] or row.get('quoteSymbol') != token['quoteSymbol'] or row.get('source') != token['source']:
                    continue
                at = timestamp(row['observedAt'])
                if row.get('providerGeneratedAt') is not None:
                    generated = timestamp(row['providerGeneratedAt'])
                    if (at-generated).total_seconds() > 3*3600 or (generated-at).total_seconds() > 60:
                        continue
                    at = min(at, generated)
                if at <= now:
                    valid.append(at)
            except (ValueError, TypeError, KeyError):
                continue
        if valid:
            if (now - max(valid)).total_seconds() > 6 * 3600:
                return True
        elif (now - timestamp(token['verifiedAt'])).total_seconds() > 6 * 3600:
            return True
    return False


def audit(fetcher=get, now=None, token=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    output = {'version': 1, 'checkedAt': now.isoformat(timespec='seconds'), 'state': 'unavailable', 'reason': 'api_unavailable',
              'workflowState': 'unknown', 'scheduledRunCount': None, 'runs': [], 'latestDatasetCommit': None,
              'cadence': {'state': 'unavailable'}}
    try:
        workflow = json.loads(fetcher(API + '/actions/workflows/reward-snapshots.yml', token))
        output['workflowState'] = 'active' if workflow.get('state') == 'active' else 'disabled' if str(workflow.get('state', '')).startswith('disabled') else 'unknown'
        page = json.loads(fetcher(API + '/actions/workflows/reward-snapshots.yml/runs?branch=main&per_page=' + str(MAX_RECENT_RUNS), token))
        runs = page['workflow_runs']
        # New cadence metadata is operator evidence only; public history/status calculations are unchanged.
        try:
            output['cadence'] = recent_cadence(page, now, workflow['created_at'])
        except (ValueError, TypeError, KeyError):
            output['cadence'] = {'state': 'unavailable'}
        scheduled = json.loads(fetcher(API + '/actions/workflows/reward-snapshots.yml/runs?branch=main&event=schedule&per_page=1', token))
        count = scheduled['total_count']
        if type(count) is not int or count < 0:
            raise ValueError('invalid_count')
        output['scheduledRunCount'] = count
        clean = summarize_runs(runs)
        jobs = json.loads(fetcher(API + '/actions/runs/' + str(clean[0]['id']) + '/jobs?per_page=3', token)) if clean else None
        output['runs'] = summarize_runs(runs, jobs)
        commits = json.loads(fetcher(API + '/commits?path=data%2Freward-snapshots.json&sha=main&per_page=1', token))
        if commits:
            latest = commits[0]
            sha = latest['sha']
            if not isinstance(sha, str) or len(sha) != 40 or any(c not in '0123456789abcdef' for c in sha):
                raise ValueError('invalid_revision')
            raw = fetcher('https://raw.githubusercontent.com/' + REPO + '/' + sha + '/data/reward-snapshots.json', None, MAX_DATA_BYTES)
            if not isinstance(json.loads(raw), dict):
                raise ValueError('invalid_dataset')
            output['latestDatasetCommit'] = {'sha': sha, 'committedAt': latest['commit']['committer']['date'], 'revision': 'sha256:' + hashlib.sha256(raw).hexdigest()}
        output['state'], output['reason'] = 'checked', None
    except Exception:
        # Keep independently obtained facts, but never mark a partial audit as checked.
        output['state'], output['reason'] = 'unavailable', 'api_unavailable'
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=pathlib.Path, default=ROOT / 'data/collector-audit.json')
    args = parser.parse_args()
    now = dt.datetime.now(dt.timezone.utc)
    result = audit(now=now, token=os.environ.get('GITHUB_TOKEN'))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.tmp')
    temporary.write_text(json.dumps(result, indent=2) + '\n')
    os.replace(temporary, args.output)
    try:
        tokens = load_mints(json.loads((ROOT / 'data/tracked-mints.json').read_text()))
        store = json.loads((ROOT / 'data/reward-snapshots.json').read_text())
        failure = result['state'] != 'checked' or data_failure(store, tokens, now)
    except Exception:
        failure = True
    output = os.environ.get('GITHUB_OUTPUT')
    if output:
        with open(output, 'a') as f:
            f.write('data_failure=' + str(failure).lower() + '\n')
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a') as f:
            f.write('## Data health audit\n\nAudit: ' + result['state'] + '\n\nScheduled collector runs observed: ' + str(result['scheduledRunCount']) + '\n\n')
            f.write('Six-hour data failure / audit unavailable: ' + str(failure).lower() + '\n\nWorkflow success alone is not observation or commit proof.\n')
            f.write('\n' + cadence_summary(result['cadence']))
    print('Audit state: ' + result['state'] + '; scheduled evidence: ' + str(result['scheduledRunCount']))


if __name__ == '__main__':
    main()
