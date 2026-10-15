"""Offline only: fixed REST fixtures; deny unexpected socket creation globally."""
import copy
import datetime as dt
import io
import json
import socket
import unittest
import urllib.error
from unittest.mock import patch
from scheduler.c2 import workflow_identity as p

NOW=dt.datetime(2026,10,15,17,30,tzinfo=dt.timezone.utc)
TOKEN='offline-workflow-token-sentinel'
ACTOR='900000001'


def environment():
    return {'SCOUT_C2_PROOF_ENABLED':'true','SCOUT_COLLECTION_GATE_ENABLED':'false',
            'SCOUT_COLLECTION_APP_ACTOR_ID':ACTOR,'C2_EXPECTED_APP_ACTOR_ID':ACTOR,'C2_APP_SLUG':'offline-scout',
            'GITHUB_ACTIONS':'true','RUNNER_ENVIRONMENT':'github-hosted','RUNNER_OS':'Linux',
            'GITHUB_REPOSITORY':p.REPO,'GITHUB_REPOSITORY_ID':str(p.REPO_ID),
            'GITHUB_REF':'refs/heads/'+p.BRANCH,'GITHUB_EVENT_NAME':'push','GITHUB_JOB':'identity-only',
            'GITHUB_WORKFLOW_REF':p.REPO+'/'+p.PATH+'@refs/heads/'+p.BRANCH,
            'GITHUB_ACTOR':'fuzzysniper','GITHUB_ACTOR_ID':str(p.OWNER_ID),'GITHUB_RUN_ATTEMPT':'1',
            'GITHUB_SHA':'a'*40,'GITHUB_WORKFLOW_SHA':'a'*40,'SCOUT_C2_APPROVED_SHA':'a'*40,
            'GITHUB_RUN_ID':'123456','GITHUB_TOKEN':TOKEN}


def fixtures():
    return {'/actions/workflows/scout-c2-identity.yml':{'id':98765,'path':p.PATH,'state':'active'},
            '/actions/runs/123456':{'id':123456,'workflow_id':98765,'path':p.PATH,'run_attempt':1,
                                  'event':'push','head_branch':p.BRANCH,'head_sha':'a'*40,
                                  'status':'in_progress','conclusion':None,'created_at':'2026-10-15T17:29:30Z',
                                  'repository':{'id':p.REPO_ID,'full_name':p.REPO},
                                  'actor':{'id':p.OWNER_ID,'login':'fuzzysniper','type':'User'},
                                  'triggering_actor':{'id':p.OWNER_ID,'login':'fuzzysniper','type':'User'}},
            '/actions/workflows/reward-snapshots.yml':{'id':p.COLLECTOR_ID,'path':p.COLLECTOR,'state':'active'},
            '/users/offline-scout%5Bbot%5D':{'id':int(ACTOR),'login':'offline-scout[bot]','type':'Bot'}}


class Response(io.BytesIO):
    status=200
    def __init__(self, data, url):
        super().__init__(data)
        self.url=url
    def geturl(self):
        return self.url


class ProofTests(unittest.TestCase):
    def setUp(self):
        self.block=patch.object(socket,'create_connection',side_effect=AssertionError('offline network forbidden'))
        self.block.start()
        self.addCleanup(self.block.stop)

    def run_proof(self, env=None, data=None, fail=None):
        calls=[]
        records=fixtures() if data is None else data
        class Client:
            def __init__(self, token, run_id, slug):
                assert token==TOKEN and run_id==123456 and slug=='offline-scout'
            def get(self, path):
                calls.append(path)
                if fail:raise fail
                return records[path]
        return p.inspect(env or environment(),Client,NOW),calls

    def safe(self, result):
        text=json.dumps(result)
        self.assertNotIn(TOKEN,text)
        self.assertNotIn('offline-sensitive-error',text)
        for field in ['dispatches','collectionClaims','providerQueries','repositoryWrites']:
            self.assertEqual(result[field],0)
        for field in ['pilotReady','hostedBindingVerified','collectorWorkflowTokenVerified']:
            self.assertIs(result[field],False)

    def test_isolated_success_distinguishes_unset_guard_current_collector_and_hosted_evidence(self):
        for setting in ['false','']:
            env=environment();env['SCOUT_COLLECTION_GATE_ENABLED']=setting
            result,calls=self.run_proof(env)
            self.assertTrue(result['passed']);self.assertEqual(result['exitCode'],0);self.assertEqual(len(calls),4)
            self.assertEqual(result['collectionGuardUnset'],setting=='');self.assertEqual(result['collectionGuardExplicitFalse'],setting=='false')
            self.safe(result)

    def test_guard_actor_branch_repo_sha_rerun_and_replay_context_reject_before_token(self):
        mutations={'SCOUT_C2_PROOF_ENABLED':['',None,'false','TRUE'],
                   'SCOUT_COLLECTION_GATE_ENABLED':['true','unknown'],
                   'SCOUT_COLLECTION_APP_ACTOR_ID':['',str(p.OWNER_ID),'1'],
                   'C2_EXPECTED_APP_ACTOR_ID':['other'], 'C2_APP_SLUG':['../outside',''],
                   'GITHUB_REF':['refs/heads/main'], 'GITHUB_EVENT_NAME':['workflow_dispatch','pull_request_target'],
                   'GITHUB_REPOSITORY':['other/repo'], 'GITHUB_REPOSITORY_ID':['1'],
                   'GITHUB_JOB':['collect'], 'GITHUB_WORKFLOW_REF':['wrong'],
                   'GITHUB_RUN_ID':['0','not-id'], 'GITHUB_RUN_ATTEMPT':['2'],
                   'GITHUB_ACTOR':['other'], 'GITHUB_ACTOR_ID':[ACTOR],
                   'GITHUB_SHA':['b'*40],'GITHUB_WORKFLOW_SHA':['b'*40],
                   'SCOUT_C2_APPROVED_SHA':['b'*40], 'SCOUT_TRIGGER_SOURCE':['external'],
                   'SCOUT_COLLECTION_SLOT':['slot'], 'RUNNER_ENVIRONMENT':['self-hosted'],'GITHUB_ACTIONS':['false'],'RUNNER_OS':['Windows']}
        for field,values in mutations.items():
            for value in values:
                env=environment()
                if value is None:env.pop(field,None)
                else:env[field]=value
                def forbidden(*_):raise AssertionError('token/client must not be accessed')
                result=p.inspect(env,forbidden,NOW);self.assertFalse(result['passed'],field);self.safe(result)
        for credential in ['APP_PRIVATE_KEY','CLOUDFLARE_API_TOKEN','CLOUDFLARE_GLOBAL_API_KEY','GH_TOKEN']:
            env=environment();env[credential]='offline-sensitive-error';result,calls=self.run_proof(env);self.assertFalse(result['passed']);self.assertEqual(calls,[]);self.safe(result)

    def test_authenticated_wrong_run_workflow_repository_actor_and_old_finished_run_fail(self):
        changes=[('id',1),('workflow_id',1),('run_attempt',2),('run_attempt',True),('path','wrong'),('head_branch','main'),
                 ('head_sha','b'*40),('event','workflow_dispatch'),('status','completed'),('conclusion','success'),
                 ('repository',{'id':1,'full_name':p.REPO}),('actor',{'id':1,'login':'fuzzysniper','type':'User'}),
                 ('triggering_actor',{'id':p.OWNER_ID,'login':'other','type':'User'}),
                 ('created_at','2026-10-15T17:20:00Z'),('created_at','2026-10-15T17:31:00Z')]
        for field,value in changes:
            data=fixtures();data['/actions/runs/123456'][field]=value;result,_=self.run_proof(data=data);self.assertFalse(result['passed'],field);self.safe(result)
        for path,key,value in [('/actions/workflows/scout-c2-identity.yml','path','wrong'),('/actions/workflows/reward-snapshots.yml','id',1),('/users/offline-scout%5Bbot%5D','id',1),('/users/offline-scout%5Bbot%5D','type','User')]:
            data=fixtures();data[path][key]=value;result,_=self.run_proof(data=data);self.assertFalse(result['passed']);self.safe(result)

    def test_fixed_http_transport_requires_auth_and_never_falls_back_redirects_or_retries(self):
        calls=[]
        class Opener:
            def open(self, request, timeout):
                calls.append(request)
                assert request.method=='GET' and request.headers['Authorization']=='Bearer '+TOKEN and timeout==5
                return Response(b'{}',request.full_url)
        client=p.Identity(TOKEN,123456,'offline-scout',Opener())
        for path in fixtures():self.assertEqual(client.get(path),{})
        self.assertEqual(len(calls),4)
        for path in ['/actions/workflows/reward-snapshots.yml/dispatches','https://untrusted.invalid','/../other','/git/refs/heads/main']:
            with self.assertRaises(p.Stop):client.get(path)
        self.assertEqual(len(calls),4)
        for token in [None,'','x'*8193,'token\n']:
            with self.assertRaises(p.Stop):p.Identity(token,123456,'offline-scout',Opener())
        with self.assertRaises(p.Stop):p.NoRedirect().redirect_request(None,None,None,None,None,None)

    def test_401_403_429_503_timeout_malformed_oversized_utf8_no_body_are_redacted(self):
        for failure in [urllib.error.HTTPError('https://api.github.com',code,'offline-sensitive-error',{},None)for code in [401,403,429,503]]+[TimeoutError('offline-sensitive-error')]:
            class Opener:
                def open(self,*_,**__):raise failure
            client=p.Identity(TOKEN,123456,'offline-scout',Opener())
            with self.assertRaises(p.Stop)as error:client.get('/actions/runs/123456')
            self.assertNotIn('offline-sensitive-error',str(error.exception))
        for data in [b'{',b'[]',b'x'*32769,b'\xff',b'']:
            class Opener:
                def open(self,request,timeout):return Response(data,request.full_url)
            with self.assertRaises(p.Stop):p.Identity(TOKEN,123456,'offline-scout',Opener()).get('/actions/runs/123456')
        result,calls=self.run_proof(fail=RuntimeError('offline-sensitive-error'));self.assertFalse(result['passed']);self.assertEqual(len(calls),1);self.safe(result)


if __name__=='__main__':
    unittest.main()
