"""Pure claim planner, used only by the separately opt-in workflow integration.

Every trigger must commit the proposed journal to main BEFORE provider access.
The Git compare-and-swap push is the lock, not concurrency or a local file.
Only validated GitHub REST run metadata may be supplied by the workflow adapter.
No HTTP, credential loading, Git mutation or command-line activation here.
"""
import datetime as dt
import re
from scripts.trigger_contract import TARGET, MAX_LATE, MAX_SLOTS, RETENTION, utc, slot_key


def plan_claim(journal, run, now, expected_app_actor_id, *, enabled=False):
    """Return (decision, candidate). No override/release exists for crashed claims.

    A claim consumes the slot even on provider failure. Retry/rerun may inspect
    artifacts but never collect again. Caller must stop on uncertain/rejected push.
    """
    if enabled is not True:
        return 'disabled', None
    try:
        current = utc(now)
        created = utc(run['created_at'])
        if (run['repository'] != 'fuzzysniper/scout-stonk-intel' or
                run['workflow'] != 'reward-snapshots.yml' or run['head_branch'] != 'main' or
                type(run['id']) is not int or not 0 < run['id'] <= 2**53 - 1 or
                type(run['run_attempt']) is not int or run['run_attempt'] != 1 or type(run['actor_id']) is not int or run['actor_id'] <= 0):
            return 'reject_identity', None
        source = run.get('trigger_source')
        if source == 'external':
            if (type(expected_app_actor_id) is not int or expected_app_actor_id <= 0 or
                    run['event'] != 'workflow_dispatch' or run['actor_id'] != expected_app_actor_id):
                return 'reject_external_actor', None
            supplied = run.get('collection_slot', '')
            if not isinstance(supplied, str) or not supplied.startswith(TARGET + '|'):
                return 'reject_slot', None
            scheduled = utc(supplied[len(TARGET) + 1:])
            if slot_key(scheduled) != supplied:
                return 'reject_slot', None
        else:
            allowed_sources = (None, '', 'native') if run['event'] == 'schedule' else (None, '', 'manual')
            if source not in allowed_sources or run.get('collection_slot'):
                return 'reject_slot', None
            if run['actor_id'] == expected_app_actor_id:
                return 'reject_external_actor', None  # App cannot masquerade as ungated/manual/native.
            if run['event'] not in ('schedule', 'workflow_dispatch'):
                return 'reject_event', None
            # Attribution policy, not proof of GitHub's intended/dropped cron slot.
            scheduled = created.replace(minute=17, second=0, microsecond=0)
            if scheduled > created:
                scheduled -= dt.timedelta(hours=1)
            source = 'native' if run['event'] == 'schedule' else 'manual'
        key = slot_key(scheduled)
        if not scheduled <= created <= current or current - scheduled > MAX_LATE:
            return 'outside_window', None
        if not isinstance(journal, dict) or set(journal) != {'version', 'claims'} or type(journal['version']) is not int or journal['version'] != 1 or not isinstance(journal['claims'], list) or len(journal['claims']) > MAX_SLOTS:
            return 'invalid_journal', None
        claims, seen = [], set()
        for row in journal['claims']:
            if not isinstance(row, dict) or set(row) != {'slot', 'source', 'run_id', 'claimed_at', 'base_sha'}:
                return 'invalid_journal', None
            at = utc(row['slot'].removeprefix(TARGET + '|'))
            claimed = utc(row['claimed_at'])
            if (slot_key(at) != row['slot'] or row['slot'] in seen or
                    row['source'] not in ('native', 'manual', 'external') or
                    type(row['run_id']) is not int or not 0 < row['run_id'] <= 2**53 - 1 or
                    not at <= claimed <= at + MAX_LATE or claimed > current or
                    not re.fullmatch(r'[a-f0-9]{40}', row['base_sha'])):
                return 'invalid_journal', None
            seen.add(row['slot'])
            if at >= current - RETENTION:
                claims.append(dict(row))
        if key in seen:
            return 'duplicate_suppressed', None
        if len(claims) >= MAX_SLOTS:
            return 'capacity_exhausted', None
        base = run['head_sha']
        if not isinstance(base, str) or not re.fullmatch(r'[a-f0-9]{40}', base):
            return 'reject_base', None
        claims.append({'slot': key, 'source': source, 'run_id': run['id'],
                       'claimed_at': current.isoformat().replace('+00:00', 'Z'), 'base_sha': base})
        return 'claim_candidate_requires_confirmed_push', {'version': 1, 'claims': claims}
    except (ValueError, KeyError, TypeError, AttributeError):
        return 'invalid_gate_input', None


def publication_authorized(candidate, accepted_remote, expected_parent, actual_parent):
    """Exact accepted claim bytes AND unchanged parent must precede collection.

    No observed data or reward times are constructed by the trigger/gate.
    """
    return (isinstance(candidate, bytes) and bool(candidate) and candidate == accepted_remote and
            isinstance(expected_parent, str) and bool(re.fullmatch(r'[a-f0-9]{40}', expected_parent)) and
            expected_parent == actual_parent)
