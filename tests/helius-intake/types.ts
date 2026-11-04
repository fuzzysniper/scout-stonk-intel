import type {Intake,RawBatch} from '../../lib/native-pilot/engine';
import type {HeliusRawBatchV1,HeliusIntakeV1} from '../../lib/native-evidence/helius-contract';
import type {NativeEvidenceV1} from '../../lib/native-evidence/contract';
import {intakeHeliusBatch} from '../../lib/native-evidence/helius-qualification';
export const actualBPort:Intake=intakeHeliusBatch;
export const additiveAPort:HeliusIntakeV1=intakeHeliusBatch;
export const actualBShape=(raw:RawBatch):HeliusRawBatchV1=>raw;
export const reverseShape=(raw:HeliusRawBatchV1):RawBatch=>raw;
// @ts-expect-error analytics cannot assert authenticated provider origin
export const forgedOrigin:NativeEvidenceV1['origin']={status:'candidate_only',providerAuthenticated:true,label:'SYNTHETIC OFFLINE'};
