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
              'workflowState': 'unknown', 'scheduledRunCount': None, 'runs': [], 'latestDatasetCommit': None}
    try:
        workflow = json.loads(fetcher(API + '/actions/workflows/reward-snapshots.yml', token))
        output['workflowState'] = 'active' if workflow.get('state') == 'active' else 'disabled' if str(workflow.get('state', '')).startswith('disabled') else 'unknown'
        runs = json.loads(fetcher(API + '/actions/workflows/reward-snapshots.yml/runs?branch=main&per_page=12', token))['workflow_runs']
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
    print('Audit state: ' + result['state'] + '; scheduled evidence: ' + str(result['scheduledRunCount']))


if __name__ == '__main__':
    main()
