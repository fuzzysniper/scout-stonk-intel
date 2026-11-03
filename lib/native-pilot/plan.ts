import 'server-only';
import {createHash} from 'node:crypto';
import {isExactPublicKey,freeze} from '../onchain-mint/validation';
import {data} from '../v4-helius-pilot/server/profile';
export const HOST='mainnet.helius-rpc.com';
export const METHODS=['getTokenLargestAccounts','getMultipleAccounts','getBlockTime'] as const;
export const LIMITS=Object.freeze({attempts:3,sessionMs:900000,concurrency:1,spacingMs:2500,timeoutMs:5000,requestBytes:2048,responseBytes:131072,headerBytes:16384,accounts:20,retries:0});
export const hash=(b:string|Uint8Array)=>createHash('sha256').update(b).digest('hex');
export const digest=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s)&&s!=='0'.repeat(64);
export function need(b:unknown):asserts b{if(!b)throw Error('native_pilot_held');}
export type Method=typeof METHODS[number];
export type Debit=Readonly<{version:'native-pilot-debit/1';reviewSha256:string;getTokenLargestAccounts:number;getMultipleAccounts:number;getBlockTime:number}>;
export type Plan=Readonly<{version:'native-pilot-plan/1';mints:readonly string[];attempts:number;credits:number;debit:Debit;steps:readonly Readonly<{mint:string;method:Method;credits:number}>[];dispatchable:false}>;
/** Planning is NOT permission. Multi-mint estimates are explicit; live policy remains <=3 attempts total. */
export function plan(mints:readonly string[],debit:Debit):Plan{
 need(Array.isArray(mints)&&mints.length>=1&&mints.length<=4&&mints.every(isExactPublicKey)&&new Set(mints).size===mints.length);
 need(data(debit,['version','reviewSha256',...METHODS])&&debit.version==='native-pilot-debit/1'&&digest(debit.reviewSha256));
 for(const method of METHODS)need(Number.isSafeInteger(debit[method])&&debit[method]>=1&&debit[method]<=100);
 const steps=mints.flatMap(mint=>METHODS.map(method=>({mint,method,credits:debit[method]})));
 return freeze({version:'native-pilot-plan/1',mints:[...mints],attempts:steps.length,credits:steps.reduce((n,s)=>n+s.credits,0),debit:{...debit},steps,dispatchable:false});
}
export type Policy=Readonly<{
 version:'native-pilot-policy/1';id:string;ownerSubject:string;issuer:string;origin:string;
 deployment:string;project:string;commit:string;tree:string;branch:string;
 startsAt:number;expiresAt:number;mint:string;debit:Debit;credits:number;
 rightsReviewSha256:string;keySha256:string;retention:'raw_memory_60s_metadata_immutable';
}>;
export function policy(value:Policy):Policy{
 need(data(value,['version','id','ownerSubject','issuer','origin','deployment','project','commit','tree','branch','startsAt','expiresAt','mint','debit','credits','rightsReviewSha256','keySha256','retention']));
 const p=freeze(JSON.parse(JSON.stringify(value))) as Policy;
 need(p.version==='native-pilot-policy/1'&&/^[a-z0-9-]{8,80}$/.test(p.id)&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(p.ownerSubject)&&/^[A-Za-z0-9:_-]{8,128}$/.test(p.issuer));
 need(p.project==='prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q'&&/^dpl_[A-Za-z0-9]{8,100}$/.test(p.deployment)&&/^[a-f0-9]{40}$/.test(p.commit)&&p.commit!=='0'.repeat(40)&&/^[a-f0-9]{40}$/.test(p.tree)&&p.tree!=='0'.repeat(40));
 need(/^https:\/\/scout-stonk-intel-[a-z0-9-]+-riskledgerapp\.vercel\.app$/.test(p.origin)&&!p.origin.includes('-git-')&&/^native-pilot\/[a-z0-9-]+$/.test(p.branch));
 need(Number.isSafeInteger(p.startsAt)&&p.startsAt>0&&Number.isSafeInteger(p.expiresAt)&&p.expiresAt>p.startsAt&&p.expiresAt-p.startsAt<=LIMITS.sessionMs);
 const estimate=plan([p.mint],p.debit);need(p.credits===estimate.credits&&digest(p.rightsReviewSha256)&&digest(p.keySha256)&&p.retention==='raw_memory_60s_metadata_immutable');
 return p;
}
