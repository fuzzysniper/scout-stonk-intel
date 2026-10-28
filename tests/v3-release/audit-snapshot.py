"""Offline authentication companion for the frozen daily audit producer.
Whole operational snapshots replace one file; immutable Git history retains old
snapshots. Audit time is NOT source-observation freshness or financial evidence.
Never calls audit(), get(), data_failure(), a provider, SQL or a credential API.
"""
import datetime as dt
import hashlib
import io
import json
import pathlib
import stat
import sys
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'scripts'))
from collect_rewards import timestamp
from audit_collector import recent_cadence

LIMIT = 256 * 1024
CONCLUSIONS = {None, 'success', 'failure', 'neutral', 'cancelled', 'skipped',
               'timed_out', 'action_required', 'stale', 'startup_failure'}


def integer(value, minimum=0, maximum=2**53-1):
    return type(value) is int and minimum <= value <= maximum


def shape(value, fields):
    assert isinstance(value, dict) and set(value) == set(fields.split(','))


def cadence(value, at):
    assert isinstance(value, dict)
    if value.get('state') == 'unavailable':
        shape(value, 'state')
        return
    shape(value, 'state,windowStart,windowEnd,nominalSlots,matureSlots,graceSeconds,listedScheduledRuns,listedManualRuns,matureSlotsWithoutRunCreation,creationOffsets,intendedSlotsKnown')
    assert value['state'] in ('checked', 'incomplete') and value['intendedSlotsKnown'] is False
    start, end = timestamp(value['windowStart']), timestamp(value['windowEnd'])
    assert end == at and dt.timedelta(0) <= end-start <= dt.timedelta(hours=24)
    # Reuse ONLY the producer's pure UTC slot/grace arithmetic. No HTTP calls.
    # Producer uses an actual microsecond clock but serializes seconds. Check
    # supported subsecond boundary possibilities; never invent finer precision.
    possibilities = set()
    for end_delta in (0, 999999):
        for start_delta in (0, 999999):
            instant, activated = at + dt.timedelta(microseconds=end_delta), start + dt.timedelta(microseconds=start_delta)
            if activated > instant:
                continue
            result = recent_cadence({'workflow_runs': [], 'total_count': 0}, instant, activated.isoformat())
            possibilities.add(tuple(result[key] for key in ('nominalSlots', 'matureSlots', 'graceSeconds')))
    assert all(type(value[key]) is int for key in ('nominalSlots', 'matureSlots', 'graceSeconds'))
    assert tuple(value[key] for key in ('nominalSlots', 'matureSlots', 'graceSeconds')) in possibilities
    assert integer(value['listedScheduledRuns'], maximum=48) and integer(value['listedManualRuns'], maximum=48)
    assert value['listedScheduledRuns'] + value['listedManualRuns'] <= 48
    offsets = value['creationOffsets']
    assert isinstance(offsets, list) and len(offsets) <= 48
    for row in offsets:
        shape(row, 'id,secondsAfterPriorSlot')
        assert integer(row['id'], 1) and integer(row['secondsAfterPriorSlot'], maximum=3599)
    ids = [row['id'] for row in offsets]
    assert len(set(ids)) == value['listedScheduledRuns']
    if value['state'] == 'checked':
        assert len(ids) == len(set(ids))
        assert integer(value['matureSlotsWithoutRunCreation'], maximum=value['matureSlots'])
    else:
        assert value['matureSlotsWithoutRunCreation'] is None
    # Offset/count fields are reported operational evidence, not independently
    # re-created remote API history or attribution to intended/dropped Cron slots.


def validate(payload):
    shape(payload, 'beforeRaw,afterRaw,run,artifact,committedAt,dataset')
    before, after = [decode(payload[key]) for key in ('beforeRaw', 'afterRaw')]
    run, dataset = payload['run'], payload['dataset']
    shape(after, 'version,checkedAt,state,reason,workflowState,scheduledRunCount,runs,latestDatasetCommit,cadence')
    assert type(after['version']) is int and after['version'] == 1
    assert isinstance(before, dict) and before.get('version') == 1
    at, previous = timestamp(after['checkedAt']), timestamp(before['checkedAt'])
    start, finish, committed = timestamp(run['run_started_at']), timestamp(run['updated_at']), timestamp(payload['committedAt'])
    assert previous < at and start < at + dt.timedelta(seconds=1) and at <= committed <= finish + dt.timedelta(seconds=60)
    shape(payload['artifact'], 'createdAt,expiresAt')
    created, expires = timestamp(payload['artifact']['createdAt']), timestamp(payload['artifact']['expiresAt'])
    assert committed <= created <= finish + dt.timedelta(seconds=60)
    assert created < expires <= created + dt.timedelta(days=7)
    assert after['state'] in ('checked', 'unavailable')
    assert after['reason'] == (None if after['state'] == 'checked' else 'api_unavailable')
    assert after['workflowState'] in ('active', 'disabled', 'unknown')
    count = after['scheduledRunCount']
    assert integer(count) or (count is None and after['state'] == 'unavailable')
    rows = after['runs']
    assert isinstance(rows, list) and len(rows) <= 12
    for row in rows:
        shape(row, 'id,event,status,conclusion,createdAt,updatedAt,collectionStep,commitStep')
        assert integer(row['id'], 1) and row['event'] in ('schedule', 'workflow_dispatch')
        assert row['status'] in ('queued', 'pending', 'requested', 'waiting', 'in_progress', 'completed')
        for key in ('conclusion', 'collectionStep', 'commitStep'):
            assert row[key] in CONCLUSIONS
        assert timestamp(row['createdAt']) <= timestamp(row['updatedAt']) <= finish + dt.timedelta(seconds=60)
    cadence(after['cadence'], at)
    linked = after['latestDatasetCommit']
    if linked is not None:
        shape(linked, 'sha,committedAt,revision')
        assert after['state'] == 'checked'
        assert linked['sha'] == dataset['sha'] and linked['revision'] == dataset['revision']
        assert timestamp(linked['committedAt']) == timestamp(dataset['committedAt']) <= at
    # Missing links, unavailable APIs and incomplete cadence remain unknown.
    # Do not require monotonic run counts: API retention/deletion can reduce them.
    return {'valid': True, 'kind': 'audit', 'sourceRequests': 0, 'financialEvidence': False}


def unique(pairs):
    out = {}
    for key, value in pairs:
        assert key not in out
        out[key] = value
    return out


def decode(raw):
    assert isinstance(raw, str) and len(raw.encode('utf-8')) <= LIMIT
    return json.loads(raw, object_pairs_hook=unique, parse_constant=lambda _: (_ for _ in ()).throw(ValueError('nonfinite')))


if __name__ == '__main__':
    try:
        raw = sys.stdin.buffer.read(4 * 1024 * 1024 + 1)
        assert len(raw) <= 4 * 1024 * 1024
        if sys.argv[1:] == ['zip']:
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                infos = archive.infolist()
                assert len(infos) == 1 and infos[0].filename == 'collector-audit.json'
                item = infos[0]
                assert not item.is_dir() and not item.flag_bits & 1
                assert stat.S_IFMT(item.external_attr >> 16) in (0, stat.S_IFREG)
                assert item.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED)
                assert item.file_size <= LIMIT and item.file_size <= max(1, item.compress_size) * 1000
                print(json.dumps({item.filename: hashlib.sha256(archive.read(item)).hexdigest()}))
        else:
            assert not sys.argv[1:]
            print(json.dumps(validate(decode(raw.decode('utf-8')))))
    except Exception:
        print('audit_transition_rejected', file=sys.stderr)
        raise SystemExit(1)
