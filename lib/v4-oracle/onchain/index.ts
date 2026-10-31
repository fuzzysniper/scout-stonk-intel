import 'server-only';
export {projectOnchainRisk} from './project';
export {decodeOnchainCapture} from './evidence';
export type {RiskInput,OnchainEvidence,Capture,Controls,Provenance,JupiterReport,RiskFinding} from './contract';
export const ONCHAIN_SOURCE=Object.freeze({enabled:false,sourceGo:false,runtimeAttempts:0,retries:0,host:'mainnet.helius-rpc.com',method:'getAccountInfo',maxAccounts:1,maxAccountBytes:8192,maxResponseBytes:65536,timeoutMs:5000,maxAgeMs:60000} as const);
/** Unconditional OFF. No config/key/transport/auth/ledger arguments, no env reads or provider calls. */
export function createOnchainRiskSource(){return Object.freeze({read:async()=>Object.freeze({state:'sources_off',sourceGo:false,evidence:null} as const)});}
