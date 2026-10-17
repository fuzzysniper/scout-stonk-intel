"""Offline operational fixtures, using genuine retained source rows, never live writes.

Run/job/commit identities below are synthetic test envelopes. No fabricated reward
amount or positive application history is created or committed to data/.
"""
import copy
import datetime as dt
import hashlib
import json
import os
import pathlib
import socket
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import collection_cadence as cadence
from scripts.collection_gate import gate


def raw(value):
    return (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode()


class GitFixture:
    def __init__(self):
        self.files = {}
    def read(self, commit, path):
        if (commit, path) not in self.files:
            raise ValueError('missing_fixture')
        return self.files[commit, path]
    def reachable(self, commit, main):
        return True
    def parents(self, commit):
        return ['b'*40]


def fixture():
    # Source values come only from genuine stored observations. The operational
    # summary is a synthetic envelope, independent of today's provider outcome.
    after = json.loads((ROOT/cadence.SNAPSHOT).read_text())
    tokens = json.loads((ROOT/cadence.ALLOWLIST).read_text())
    results = [{'mint': t['mint'], 'status': 'collected', 'reason': 'collected',
                'observedAt': after[t['mint']][-1]['observedAt']} for t in tokens]
    times = [cadence.utc(r['observedAt']) for r in results]
    summary = {'version': 1, 'runId': 123456, 'event': 'workflow_dispatch',
               'startedAt': cadence.iso(min(times)), 'finishedAt': cadence.iso(max(times)),
               'overall': 'complete', 'results': results}
    before = copy.deepcopy(after)
    for r in summary['results']:
        before[r['mint']] = [p for p in before[r['mint']] if p['observedAt'] != r['observedAt']]
    start, end = cadence.utc(summary['startedAt']), cadence.utc(summary['finishedAt'])
    created = cadence.iso(start-dt.timedelta(seconds=5))
    run = {'id': summary['runId'], 'workflow_id': 123, 'path': cadence.WORKFLOW,
           'head_branch': 'main', 'head_sha': 'b'*40, 'run_attempt': 1,
           'event': summary['event'], 'created_at': created, 'status': 'completed', 'conclusion': 'success'}
    def step(name, lo, hi, conclusion='success'):
        return {'name': name, 'started_at': cadence.iso(lo), 'completed_at': cadence.iso(hi), 'conclusion': conclusion}
    job = {'id': 456, 'run_id': run['id'], 'run_attempt': 1, 'head_sha': 'b'*40,
           'name': 'collect', 'status': 'completed', 'conclusion': 'success', 'started_at': created,
           'completed_at': cadence.iso(end+dt.timedelta(seconds=2)), 'steps': [
               step('Shared claim gate (default off)', start, start, 'skipped'),
               step('Collect observations', start-dt.timedelta(seconds=1), end),
               step('Persist observations and summary', end, end+dt.timedelta(seconds=1))]}
    summary['expectedDatasetRevision'] = cadence.digest(raw(after))
    main = 'a'*40
    git = GitFixture()
    git.files[main, cadence.SNAPSHOT] = raw(after)
    git.files[main, cadence.SUMMARY] = raw(summary)
    git.files[main, cadence.ALLOWLIST] = (ROOT/cadence.ALLOWLIST).read_bytes()
    git.files['b'*40, cadence.SNAPSHOT] = raw(before)
    bundle = {'schemaVersion': 1, 'asOf': cadence.iso(end+dt.timedelta(minutes=20)), 'mainSha': main,
              'workflow': {'id': 123, 'created_at': cadence.iso(start-dt.timedelta(days=3))},
              'runs': {'total_count': 1, 'workflow_runs': [run]},
              'jobs': {str(run['id']): {'total_count': 1, 'jobs': [job]}},
              'commits': [{'sha': main, 'parents': ['b'*40], 'committedAt': cadence.iso(end)}]}
    return bundle, git


class CadenceTests(unittest.TestCase):
    def test_genuine_rows_verify_without_network_or_wallet_access_and_output_no_amounts(self):
        b,g=fixture()
        with patch.object(socket, 'socket', side_effect=AssertionError('no network')):
            r=cadence.analyze(b,g)
        p=r['runEvidence'][0]
        self.assertEqual((p['state'],p['collected'],p['failed']),('verified_persistence',7,0))
        text=json.dumps(r)
        self.assertNotIn('distributedTokens',text);self.assertNotIn('payoutCount',text)
        self.assertEqual(r['pilotDecision'],'no_go');self.assertFalse(r['intendedSlotsKnown'])
        self.assertEqual([w['nominalSlots'] for w in r['windows']],[24,48])

    def test_missing_summary_hash_wrong_run_or_old_reused_summary_never_prove_persistence(self):
        for change in ['hash','run','time']:
            b,g=fixture();s=json.loads(g.files['a'*40,cadence.SUMMARY])
            if change=='hash':s['expectedDatasetRevision']='sha256:'+'0'*64
            elif change=='run':s['runId']+=1
            else:s['startedAt']='2000-01-01T00:00:00Z'
            g.files['a'*40,cadence.SUMMARY]=raw(s)
            r=cadence.analyze(b,g)
            self.assertNotEqual(r['runEvidence'][0]['state'],'verified_persistence')
            self.assertEqual(r['windows'][0]['verifiedDataRuns'],0)
            self.assertFalse(r['windows'][0]['runProofComplete'])

    def test_skipped_collection_and_rerun_are_not_green_data_success(self):
        for kind in ['skipped','rerun','wrong_job']:
            b,g=fixture();run=b['runs']['workflow_runs'][0];j=b['jobs'][str(run['id'])]['jobs'][0]
            if kind=='skipped':j['steps'][1]['conclusion']='skipped'
            elif kind=='rerun':run['run_attempt']=2
            else:j['run_id']+=1
            r=cadence.analyze(b,g)
            self.assertEqual(r['windows'][0]['verifiedDataRuns'],0)
            self.assertNotEqual(r['runEvidence'][0]['state'],'verified_persistence')

    def test_commit_failure_unreachable_commit_or_non_append_change_is_separate(self):
        for kind in ['push','ancestry','rewrite']:
            b,g=fixture();run=b['runs']['workflow_runs'][0]
            if kind=='push':b['jobs'][str(run['id'])]['jobs'][0]['steps'][2]['conclusion']='failure'
            elif kind=='ancestry':g.reachable=lambda *_:False
            else:
                before=json.loads(g.files['b'*40,cadence.SNAPSHOT]);mint=next(iter(before));before[mint][0]['observedAt']='2000-01-01T00:00:00Z';g.files['b'*40,cadence.SNAPSHOT]=raw(before)
            r=cadence.analyze(b,g);self.assertEqual(r['windows'][0]['verifiedDataRuns'],0)
            self.assertIsNone(r['runEvidence'][0]['collected'])

    def test_partial_provider_failure_preserves_successful_rows_and_failure_denominator(self):
        b,g=fixture();s=json.loads(g.files['a'*40,cadence.SUMMARY]);result=s['results'][0];mint=result['mint']
        after=json.loads(g.files['a'*40,cadence.SNAPSHOT]);before=json.loads(g.files['b'*40,cadence.SNAPSHOT]);after[mint]=before[mint]
        result.update(status='failed',reason='provider_rate_limited',observedAt=None);s['overall']='partial';s['expectedDatasetRevision']=cadence.digest(raw(after))
        g.files['a'*40,cadence.SNAPSHOT]=raw(after);g.files['a'*40,cadence.SUMMARY]=raw(s)
        r=cadence.analyze(b,g);p=r['runEvidence'][0]
        self.assertEqual((p['state'],p['collected'],p['failed']),('verified_persistence',6,1))
        self.assertEqual(r['windows'][0]['verifiedCollectionFailures'],1)
        self.assertEqual(r['windows'][0]['failureReasons'],{'provider_rate_limited':1})

    def test_missing_jobs_truncated_or_duplicate_listing_withhold_absent_run_claim(self):
        for kind in ['truncated','duplicate','foreign']:
            b,g=fixture();run=b['runs']['workflow_runs'][0]
            if kind=='truncated':b['runs']['total_count']=200
            elif kind=='duplicate':b['runs']['workflow_runs'].append(copy.deepcopy(run));b['runs']['total_count']=2
            else:run['path']='.github/workflows/data-health.yml'
            r=cadence.analyze(b,g);self.assertFalse(r['listingCompleteForWindow'])
            self.assertIsNone(r['windows'][0]['matureBucketsWithoutScheduledCreation'])
            self.assertFalse(r['windows'][0]['runProofComplete'])
            self.assertLessEqual(r['windows'][0]['verifiedDataRuns'],1)
        b,g=fixture();b['jobs']={}
        self.assertEqual(cadence.analyze(b,g)['runEvidence'][0]['state'],'job_evidence_unavailable')

    def test_minute17_attribution_grace_and_duplicate_hours_never_invent_intended_slots(self):
        t=cadence.utc('2026-10-16T07:13:59Z');self.assertEqual(cadence.iso(cadence.slot(t)),'2026-10-16T06:17:00Z')
        b,g=fixture();run=b['runs']['workflow_runs'][0];run['event']='schedule';b['jobs']={}
        r=cadence.analyze(b,g);self.assertEqual(r['windows'][0]['nominalSlots'],24);self.assertEqual(r['windows'][0]['matureCreationBuckets'],1)
        self.assertEqual(r['windows'][0]['matureBucketsWithoutScheduledCreation'],r['windows'][0]['matureSlots']-1)

    def test_future_run_and_unbounded_input_are_rejected(self):
        b,g=fixture();b['runs']['workflow_runs'][0]['created_at']='2099-01-01T00:00:00Z'
        with self.assertRaises(ValueError):cadence.analyze(b,g)
        b,g=fixture();b['runs']['workflow_runs']*=101
        with self.assertRaises(ValueError):cadence.analyze(b,g)
        with tempfile.NamedTemporaryFile() as f:
            f.write(b' '* (cadence.MAX_INPUT+1));f.flush()
            r=subprocess.run([sys.executable,str(ROOT/'scripts/collection_cadence.py'),f.name],capture_output=True,text=True)
        self.assertEqual(r.returncode,2);self.assertNotIn('Traceback',r.stderr);self.assertIn('no_go',r.stdout)

    def test_actual_owner_reported_app_actor_cannot_fall_through_unset_gate(self):
        for setting in ['', 'false']:
            env={'SCOUT_COLLECTION_GATE_ENABLED':setting,'SCOUT_COLLECTION_APP_ACTOR_ID':'342326617','GITHUB_ACTOR_ID':'342326617'}
            def forbidden():raise AssertionError('disabled path must not authenticate')
            code,receipt=gate(env,forbidden,None,lambda:dt.datetime(2026,10,16,20,0,tzinfo=dt.timezone.utc))
            self.assertNotEqual(code,0);self.assertFalse(receipt['collect'])
            self.assertEqual(receipt['decision'],'external_entry_disabled')

    def test_git_reader_never_inherits_live_credentials_or_enables_lazy_fetch(self):
        with patch.dict(os.environ,{'GITHUB_TOKEN':'not-a-real-token','APP_PRIVATE_KEY':'not-a-real-key','CLOUDFLARE_API_TOKEN':'not-a-real-token'}):
            reader=cadence.LocalGit()
        for key in ['GITHUB_TOKEN','APP_PRIVATE_KEY','CLOUDFLARE_API_TOKEN','HOME','GH_TOKEN']:
            self.assertNotIn(key,reader.environment)
        self.assertEqual(reader.environment['GIT_NO_LAZY_FETCH'],'1')

    def test_real_read_only_git_plumbing_and_unavailable_object_fail_closed(self):
        b,g=fixture()
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            def git(*args):return subprocess.check_output(['git',*args],cwd=root,stderr=subprocess.DEVNULL).decode().strip()
            git('init','--initial-branch=main');git('config','user.name','Offline Test');git('config','user.email','test@example.invalid')
            (root/'data').mkdir()
            for p in (cadence.SNAPSHOT,cadence.ALLOWLIST):
                (root/p).write_bytes(g.files['b'*40,cadence.SNAPSHOT] if p==cadence.SNAPSHOT else g.files['a'*40,p])
            git('add','data');git('commit','-m','genuine rows, synthetic ops fixture');parent=git('rev-parse','HEAD')
            for p in (cadence.SNAPSHOT,cadence.SUMMARY):(root/p).write_bytes(g.files['a'*40,p])
            git('add','data');git('commit','-m','recorded rows appended in test only');head=git('rev-parse','HEAD')
            b['mainSha']=head;b['commits'][0].update(sha=head,parents=[parent]);run=b['runs']['workflow_runs'][0];run['head_sha']=parent;b['jobs'][str(run['id'])]['jobs'][0]['head_sha']=parent
            real=cadence.LocalGit(root);self.assertEqual(cadence.analyze(b,real)['runEvidence'][0]['state'],'verified_persistence')
            with self.assertRaises(ValueError):real.read('--bad',cadence.SNAPSHOT)
            with self.assertRaises(ValueError):real.read(head,'.env')
            self.assertEqual(git('status','--porcelain'),'')


if __name__=='__main__':unittest.main()
