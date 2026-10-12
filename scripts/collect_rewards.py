#!/usr/bin/env python3
"""Bounded, allowlisted StonkFun observation collection. Never synthesize history."""
import argparse
import datetime as dt
import hashlib
import json
import math
import os
import pathlib
import re
import urllib.request
import urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[1]
MINTS = ROOT / 'data' / 'tracked-mints.json'
OUT = ROOT / 'data' / 'reward-snapshots.json'
SUMMARY = ROOT / 'data' / 'collection-summary.json'
MAX_MINTS = 10
MAX_POINTS = 24 * 8 + 1
MAX_BYTES = 256 * 1024
TIMEOUT = 8
BASE = 'https://www.stonkfun.xyz/api/public/v1/tokens/'
ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'


class CollectionError(ValueError):
    def __init__(self, reason):
        self.reason = reason
        super().__init__(reason)


def failure_reason(exc):
    if isinstance(exc, CollectionError):
        return exc.reason
    if isinstance(exc, urllib.error.HTTPError):
        return {404: 'provider_not_found', 429: 'provider_rate_limited'}.get(exc.code, 'http_error')
    if isinstance(exc, (TimeoutError,)):
        return 'network_timeout'
    if isinstance(exc, urllib.error.URLError):
        return 'network_timeout' if isinstance(exc.reason, TimeoutError) else 'network_error'
    if isinstance(exc, json.JSONDecodeError):
        return 'invalid_json'
    return 'unexpected_error'


def is_mint(value):
    if not isinstance(value, str) or not 32 <= len(value) <= 44 or any(c not in ALPHABET for c in value):
        return False
    n = 0
    for c in value:
        n = n * 58 + ALPHABET.index(c)
    return (len(value) - len(value.lstrip('1'))) + (n.bit_length() + 7) // 8 == 32


def load_mints(value):
    if not isinstance(value, list) or not 1 <= len(value) <= MAX_MINTS:
        raise ValueError('Invalid tracked mint list')
    seen = set()
    for token in value:
        if not isinstance(token, dict) or not is_mint(token.get('mint')) or not is_mint(token.get('quoteMint')):
            raise ValueError('Invalid mint identity')
        mint = token['mint']
        if mint in seen or not isinstance(token.get('quoteSymbol'), str) or not re.fullmatch(r'[A-Za-z0-9._-]{1,32}', token['quoteSymbol']):
            raise ValueError('Duplicate mint or invalid quote')
        if token.get('source') != BASE + mint + '/rewards':
            raise ValueError('Unverified provenance')
        seen.add(mint)
    return value


def timestamp(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)', value):
        raise ValueError('Invalid timestamp')
    return dt.datetime.fromisoformat(value.replace('Z', '+00:00'))


def amount(value):
    return type(value) in (int, float) and math.isfinite(value) and value >= 0


def fetch(token, opener=urllib.request.urlopen, now=None):
    url = BASE + token['mint'] + '/rewards'
    req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'SCOUT-Research/1.0'})
    with opener(req, timeout=TIMEOUT) as response:
        # Do not follow a redirect to a different source silently.
        if response.geturl() != url:
            raise CollectionError('source_redirect')
        raw_bytes = response.read(MAX_BYTES + 1)
        if len(raw_bytes) > MAX_BYTES:
            raise CollectionError('oversized_response')
        raw = json.loads(raw_bytes)
    observed = now() if now else dt.datetime.now(dt.timezone.utc)
    data = raw.get('data') if isinstance(raw, dict) else None
    if not isinstance(data, dict) or data.get('mint') != token['mint'] or data.get('mode') != 'reward':
        raise CollectionError('mint_mode_mismatch')
    quote = data.get('quote')
    if not isinstance(quote, dict) or quote.get('mint') != token['quoteMint'] or quote.get('symbol') != token['quoteSymbol']:
        raise CollectionError('quote_mismatch')
    rewards = data.get('rewards')
    if not isinstance(rewards, dict) or not amount(rewards.get('distributedTokens')):
        raise CollectionError('invalid_counter')
    meta = raw.get('meta')
    generated = meta.get('generatedAt') if isinstance(meta, dict) else None
    try:
        generated_time = timestamp(generated)
    except ValueError as exc:
        raise CollectionError('invalid_provider_time') from exc
    age = (observed - generated_time).total_seconds()
    if age > 3 * 3600 or age < -60:
        raise CollectionError('stale_provider')
    safe_count = lambda v: v if type(v) is int and 0 <= v <= 2**53 - 1 else None
    return {'observedAt': observed.isoformat(timespec='seconds'),
            'providerGeneratedAt': generated, 'mode': 'reward',
            'distributedTokens': rewards['distributedTokens'],
            'payoutCount': safe_count(rewards.get('payoutCount')),
            'holderCount': safe_count(rewards.get('holderCount')),
            'lastPayoutAt': rewards.get('lastPayoutAt') if isinstance(rewards.get('lastPayoutAt'), str) else None,
            'quoteMint': quote['mint'], 'quoteSymbol': quote['symbol'], 'source': url}


def append_observation(history, record, log=print):
    if not isinstance(history, list):
        raise CollectionError('invalid_storage')
    current = timestamp(record['observedAt'])
    # Never rewrite an existing timestamp, including a conflicting duplicate.
    for old in history:
        if not isinstance(old, dict):
            continue
        try:
            previous = timestamp(old.get('observedAt'))
        except (ValueError, TypeError):
            continue
        if previous == current:
            log('duplicate timestamp; existing observation preserved')
            return False
        if previous > current:
            raise CollectionError('out_of_order')
    previous = history[-1] if history and isinstance(history[-1], dict) else {}
    old_total = previous.get('distributedTokens')
    old_count = previous.get('payoutCount')
    if (amount(old_total) and record['distributedTokens'] < old_total) or (type(old_count) is int and type(record.get('payoutCount')) is int and record['payoutCount'] < old_count):
        log('counter decrease/reset recorded; comparisons must be withheld')
    history.append(record)
    del history[:-MAX_POINTS]
    return True


def collect(tokens, records, fetcher=fetch, log=print, summary=None):
    load_mints(tokens)
    if not isinstance(records, dict):
        raise ValueError('Invalid stored dataset')
    success = 0
    results = []
    for token in tokens:
        mint = token['mint']
        try:
            record = fetcher(token)
            history = records.get(mint, [])
            messages = []
            def note(message):
                messages.append(message)
                log(mint + ': ' + message)
            if append_observation(history, record, note):
                records[mint] = history
                success += 1
                reason = 'counter_reset_recorded' if any('reset' in message for message in messages) else 'collected'
                results.append({'mint': mint, 'status': 'collected', 'reason': reason, 'observedAt': record['observedAt']})
                log(mint + ': recorded at ' + record['observedAt'])
            else:
                results.append({'mint': mint, 'status': 'skipped', 'reason': 'duplicate_timestamp', 'observedAt': None})
        except Exception as exc:
            # No response bodies, URLs from redirects, credentials or arbitrary exceptions in logs.
            reason = failure_reason(exc)
            results.append({'mint': mint, 'status': 'failed', 'reason': reason, 'observedAt': None})
            log(mint + ': collection failed (' + reason + '); no observation added')
    if summary is not None:
        summary['results'] = results
        summary['overall'] = 'complete' if success == len(tokens) else 'partial' if success else 'failed' if any(row['status'] == 'failed' for row in results) else 'skipped'
    return success


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--summary', type=pathlib.Path, default=SUMMARY)
    args = parser.parse_args()
    started = dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    run = os.environ.get('GITHUB_RUN_ID', '')
    event = os.environ.get('GITHUB_EVENT_NAME', 'local')
    summary = {'version': 1, 'startedAt': started, 'finishedAt': started,
               'event': event if event in ('schedule', 'workflow_dispatch', 'local') else 'unknown',
               'runId': int(run) if run.isdigit() and 0 < int(run) <= 2**53-1 else None,
               'overall': 'failed', 'expectedDatasetRevision': None, 'results': []}
    try:
        tokens = load_mints(json.loads(MINTS.read_text()))
        records = json.loads(OUT.read_text()) if OUT.exists() else {}
        success = collect(tokens, records, summary=summary)
        if success:
            OUT.parent.mkdir(parents=True, exist_ok=True)
            temporary = OUT.with_suffix('.tmp')
            temporary.write_text(json.dumps(records, indent=2, ensure_ascii=False, allow_nan=False) + '\n')
            os.replace(temporary, OUT)
        if OUT.exists():
            summary['expectedDatasetRevision'] = 'sha256:' + hashlib.sha256(OUT.read_bytes()).hexdigest()
    except Exception:
        summary['overall'] = 'failed'
        print('Collector configuration/storage failure; no success is claimed')
    summary['finishedAt'] = dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    args.summary.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.summary.with_suffix('.tmp')
    temporary.write_text(json.dumps(summary, indent=2) + '\n')
    os.replace(temporary, args.summary)
    # Always emit bounded status totals, never arbitrary provider exceptions or credentials.
    totals = {status: sum(row['status'] == status for row in summary['results']) for status in ('collected','failed','skipped')}
    print('Collection summary: ' + json.dumps(totals, sort_keys=True))
    step_summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if step_summary:
        with open(step_summary, 'a') as output:
            output.write('## Collector attempt\n\n' + json.dumps(totals, sort_keys=True) + '\n\n')
            for row in summary['results']:
                output.write('- ' + row['mint'] + ': ' + row['status'] + ' / ' + row['reason'] + '\n')
            output.write('\nCollection is not persistence proof. Check the commit step and served dataset revision.\n')
    if summary['overall'] == 'failed':
        raise SystemExit(1)


if __name__ == '__main__':
    main()
