#!/usr/bin/env python3
"""Bounded, allowlisted StonkFun observation collection. Never synthesize history."""
import datetime as dt
import json
import math
import os
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
MINTS = ROOT / 'data' / 'tracked-mints.json'
OUT = ROOT / 'data' / 'reward-snapshots.json'
MAX_MINTS = 10
MAX_POINTS = 24 * 8 + 1
MAX_BYTES = 256 * 1024
TIMEOUT = 8
BASE = 'https://www.stonkfun.xyz/api/public/v1/tokens/'
ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'


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
            raise ValueError('Unexpected source redirect')
        raw_bytes = response.read(MAX_BYTES + 1)
        if len(raw_bytes) > MAX_BYTES:
            raise ValueError('Oversized API response')
        raw = json.loads(raw_bytes)
    observed = now() if now else dt.datetime.now(dt.timezone.utc)
    data = raw.get('data') if isinstance(raw, dict) else None
    if not isinstance(data, dict) or data.get('mint') != token['mint'] or data.get('mode') != 'reward':
        raise ValueError('Mint or reward mode mismatch')
    quote = data.get('quote')
    if not isinstance(quote, dict) or quote.get('mint') != token['quoteMint'] or quote.get('symbol') != token['quoteSymbol']:
        raise ValueError('Quote identity mismatch')
    rewards = data.get('rewards')
    if not isinstance(rewards, dict) or not amount(rewards.get('distributedTokens')):
        raise ValueError('Missing or invalid counter')
    meta = raw.get('meta')
    generated = meta.get('generatedAt') if isinstance(meta, dict) else None
    generated_time = timestamp(generated)
    age = (observed - generated_time).total_seconds()
    if age > 3 * 3600 or age < -60:
        raise ValueError('Stale or future provider response')
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
        raise ValueError('Invalid stored history')
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
            raise ValueError('New observation precedes stored history')
    previous = history[-1] if history and isinstance(history[-1], dict) else {}
    old_total = previous.get('distributedTokens')
    old_count = previous.get('payoutCount')
    if (amount(old_total) and record['distributedTokens'] < old_total) or (type(old_count) is int and type(record.get('payoutCount')) is int and record['payoutCount'] < old_count):
        log('counter decrease/reset recorded; comparisons must be withheld')
    history.append(record)
    del history[:-MAX_POINTS]
    return True


def collect(tokens, records, fetcher=fetch, log=print):
    load_mints(tokens)
    if not isinstance(records, dict):
        raise ValueError('Invalid stored dataset')
    success = 0
    for token in tokens:
        mint = token['mint']
        try:
            record = fetcher(token)
            history = records.get(mint, [])
            if append_observation(history, record, lambda message: log(mint + ': ' + message)):
                records[mint] = history
                success += 1
                log(mint + ': recorded at ' + record['observedAt'])
        except Exception as exc:
            # No response bodies, URLs from redirects, credentials or arbitrary exceptions in logs.
            log(mint + ': collection failed (' + type(exc).__name__ + '); no observation added')
    return success


def main():
    tokens = load_mints(json.loads(MINTS.read_text()))
    records = json.loads(OUT.read_text()) if OUT.exists() else {}
    success = collect(tokens, records)
    if not success:
        raise RuntimeError('No new verified snapshots collected')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUT.with_suffix('.tmp')
    temporary.write_text(json.dumps(records, indent=2, ensure_ascii=False, allow_nan=False) + '\n')
    os.replace(temporary, OUT)
    print('Recorded ' + str(success) + ' sourced observation(s)')


if __name__ == '__main__':
    main()
