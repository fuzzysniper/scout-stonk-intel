"""Offline bridge: actual mocked Worker payload -> authenticated fixture -> real local Git CAS.
Never import this as a workflow command. No live GitHub/provider/credential use.
"""
import hashlib
import datetime as dt
import json
import pathlib
import subprocess
import sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from collection_gate_test import GitFixture, FakeIdentity, git, adapter, PUBLISH
from scripts.trigger_contract import TARGET, slot_key, utc

payload = json.loads(sys.argv[1])
assert set(payload) == {'ref', 'return_run_details', 'inputs'}
assert payload['ref'] == 'main' and payload['return_run_details'] is True
assert set(payload['inputs']) == {'collection_slot', 'trigger_source'}
assert payload['inputs']['trigger_source'] == 'external'
supplied = payload['inputs']['collection_slot']
scheduled = utc(supplied.removeprefix(TARGET+'|'))
assert slot_key(scheduled) == supplied
now = scheduled + dt.timedelta(seconds=30)
results = []
for winner in ('native', 'manual', 'external', 'uncertain'):
    fixture = GitFixture('test_every_source_cas_precedes_provider_and_all_cross_source_duplicates_stop')
    fixture.setUp()
    try:
        fixture.provider_time = now
        def context(source, rid, root):
            env = fixture.context(source, rid, root)
            env['SCOUT_COLLECTION_SLOT'] = supplied if source == 'external' else ''
            api = FakeIdentity(env)
            # Trusted mock REST creation/actor/head, independent of dispatch input.
            api.run['created_at'] = scheduled.isoformat()
            return env, api
        env, api = context('external' if winner == 'uncertain' else winner, 101, fixture.first)
        claims = fixture.claims()
        if winner == 'uncertain':
            class LostResponse(adapter.GitClaims):
                def command(self, *args):
                    value = super().command(*args)
                    if args[0] == 'push': raise adapter.GateStop('git_unavailable')
                    return value
            claims = fixture.claims(cls=LostResponse)
        code, receipt = fixture.execute(env, identity=api, claims=claims, now=lambda: now)
        records, summary = fixture.collect_when_allowed(code, receipt)
        assert fixture.provider_queries == (0 if winner == 'uncertain' else 1)
        data_confirmed = False
        if winner != 'uncertain':
            data = json.dumps(records, sort_keys=True)+'\n'
            (fixture.first/'data/reward-snapshots.json').write_text(data)
            summary['expectedDatasetRevision'] = 'sha256:'+hashlib.sha256(data.encode()).hexdigest()
            (fixture.first/'data/collection-summary.json').write_text(json.dumps(summary)+'\n')
            result = subprocess.run(['bash','-c',PUBLISH],cwd=fixture.first,capture_output=True,
                                    env={**__import__('os').environ,'GITHUB_STEP_SUMMARY':str(fixture.root/'step-summary')})
            assert result.returncode == 0
            remote = git(fixture.remote,'rev-parse','main').stdout.strip()
            assert git(fixture.remote,'rev-parse','main^').stdout.strip() == receipt['claim_commit']
            assert git(fixture.remote,'show','main:data/reward-snapshots.json').stdout == data
            data_confirmed = remote == git(fixture.first,'rev-parse','HEAD').stdout.strip()
        # Every source restarts from current main, then the same slot stays consumed.
        for index, source in enumerate(('native', 'manual', 'external')):
            clone = fixture.clone('duplicate-'+source)
            e, identity = context(source, 201+index, clone)
            c, r = fixture.execute(e, clone, identity=identity, now=lambda: now)
            assert c == 0 and r['decision'] == 'duplicate_suppressed' and not r['collect']
            fixture.collect_when_allowed(c, r)
        assert fixture.provider_queries == (0 if winner == 'uncertain' else 1)
        journal = json.loads(git(fixture.remote, 'show', 'main:'+adapter.JOURNAL).stdout)
        assert len(journal['claims']) == 1
        assert journal['claims'][0]['slot'] == supplied
        # A new genuine slot can recover; never release or replay the consumed one.
        if winner == 'uncertain':
            clone = fixture.clone('next-hour')
            e = fixture.context('external', 301, clone); identity = FakeIdentity(e)
            next_slot = scheduled + dt.timedelta(hours=1)
            e['SCOUT_COLLECTION_SLOT'] = slot_key(next_slot); identity.run['created_at'] = next_slot.isoformat()
            fixture.provider_time = now + dt.timedelta(hours=1)
            c, r = fixture.execute(e, clone, identity=identity, now=lambda: now+dt.timedelta(hours=1))
            assert c == 0 and r['collect']; fixture.collect_when_allowed(c, r)
            assert fixture.provider_queries == 1
        results.append({'winner':winner,'confirmedBeforeQueries':winner!='uncertain','sameSlotQueries':0 if winner=='uncertain' else 1,'duplicateQueries':0,'consumedAfterUncertainty':winner=='uncertain','dataCommitConfirmed':data_confirmed})
    finally:
        fixture.doCleanups()
print(json.dumps({'kind':'offline_mock_worker_to_real_local_git','results':results,'liveRequests':0}))
