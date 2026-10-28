"""Pure offline producer-compatible validation. Never calls fetch/collect/main.
Git commits remain append-only; existing rolling193 policy is not expanded/reset.
"""
import copy
import datetime as dt
import json
import math
import pathlib
import sys
import io
import hashlib
import stat
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from scripts.collect_rewards import MAX_POINTS, append_observation, load_mints, timestamp


def check(payload):
    before, after, summary, tracked, run = (payload[k] for k in ('before', 'after', 'summary', 'tracked', 'run'))
    load_mints(tracked)
    assert isinstance(before, dict) and isinstance(after, dict)
    assert set(after) == set(before), 'mint_enrollment_or_removal'
    assert set(before) <= {t['mint'] for t in tracked}, 'unknown_existing_mint'
    assert set(summary) == {'version', 'startedAt', 'finishedAt', 'event', 'runId', 'overall', 'expectedDatasetRevision', 'results'}
    assert summary['version'] == 1 and summary['event'] == 'schedule' and summary['runId'] == run['id']
    start, finish = timestamp(summary['startedAt']), timestamp(summary['finishedAt'])
    assert timestamp(run['run_started_at']) <= start <= finish <= timestamp(run['updated_at']) + dt.timedelta(seconds=60)
    assert isinstance(summary['results'], list) and len(summary['results']) == len(tracked)
    expected = copy.deepcopy(before)
    statuses, added = [], 0
    for token, row in zip(tracked, summary['results']):
        assert set(row) == {'mint', 'status', 'reason', 'observedAt'} and row['mint'] == token['mint']
        mint, status = row['mint'], row['status']
        assert status in ('collected', 'failed', 'skipped')
        statuses.append(status)
        if status != 'collected':
            assert row['observedAt'] is None and isinstance(row['reason'], str) and 0 < len(row['reason']) <= 80
            continue
        assert row['reason'] in ('collected', 'counter_reset_recorded')
        assert isinstance(after[mint], list) and after[mint]
        new = after[mint][-1]
        assert set(new) == {'observedAt', 'providerGeneratedAt', 'mode', 'distributedTokens', 'payoutCount', 'holderCount', 'lastPayoutAt', 'quoteMint', 'quoteSymbol', 'source'}
        assert new['mode'] == 'reward' and new['quoteMint'] == token['quoteMint'] and new['quoteSymbol'] == token['quoteSymbol'] and new['source'] == token['source']
        observed, provider = timestamp(new['observedAt']), timestamp(new['providerGeneratedAt'])
        assert new['observedAt'] == row['observedAt'] and start <= observed <= finish
        assert -60 <= (observed - provider).total_seconds() <= 10800
        assert type(new['distributedTokens']) in (int, float) and math.isfinite(new['distributedTokens']) and new['distributedTokens'] >= 0
        for field in ('payoutCount', 'holderCount'):
            value = new[field]
            assert value is None or (type(value) is int and 0 <= value <= 2**53-1)
        assert new['lastPayoutAt'] is None or isinstance(new['lastPayoutAt'], str)
        assert isinstance(expected[mint], list) and len(expected[mint]) <= MAX_POINTS
        assert append_observation(expected[mint], new, log=lambda _: None)
        added += 1
    assert expected == after, 'history_rewrite_or_nonproducer_pruning'
    wanted = 'complete' if added == len(tracked) else 'partial' if added else 'failed' if 'failed' in statuses else 'skipped'
    assert summary['overall'] == wanted
    return {'valid': True, 'appended': added, 'retentionPoints': MAX_POINTS, 'sourceRequests': 0}


def unique(pairs):
    out = {}
    for k, v in pairs:
        if k in out:
            raise ValueError('duplicate_key')
        out[k] = v
    return out


if __name__ == '__main__':
    try:
        raw = sys.stdin.buffer.read(16 * 1024 * 1024 + 1)
        assert len(raw) <= 16 * 1024 * 1024
        if sys.argv[1:] == ['zip']:
            assert len(raw) <= 4 * 1024 * 1024
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                infos = archive.infolist()
                assert len(infos) == 2 and {i.filename for i in infos} == {'collection-summary.json', 'reward-snapshots.json'}
                assert sum(i.file_size for i in infos) <= 4 * 1024 * 1024
                hashes = {}
                for i in infos:
                    assert not i.is_dir() and not i.flag_bits & 1
                    assert stat.S_IFMT(i.external_attr >> 16) in (0, stat.S_IFREG)
                    assert i.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED)
                    assert i.file_size <= max(1, i.compress_size) * 1000
                    hashes[i.filename] = hashlib.sha256(archive.read(i)).hexdigest()
                print(json.dumps(hashes))
        else:
            assert not sys.argv[1:]
            payload = json.loads(raw, object_pairs_hook=unique, parse_constant=lambda _: (_ for _ in ()).throw(ValueError('nonfinite')))
            assert set(payload) == {'beforeRaw', 'afterRaw', 'summaryRaw', 'trackedRaw', 'run'}
            decoded = {'run': payload['run']}
            for name in ('before', 'after', 'summary', 'tracked'):
                value = payload[name + 'Raw']
                assert isinstance(value, str) and len(value.encode('utf-8')) <= 4 * 1024 * 1024
                decoded[name] = json.loads(value, object_pairs_hook=unique, parse_constant=lambda _: (_ for _ in ()).throw(ValueError('nonfinite')))
            print(json.dumps(check(decoded)))
    except Exception:
        print('collector_transition_rejected', file=sys.stderr)
        raise SystemExit(1)
