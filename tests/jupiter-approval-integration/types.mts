import type {TurnkeyClient} from '../../experiments/jupiter-beta-approval/integration/node_modules/@turnkey/http/dist/index.js';
import {rawBody,ACTIVATION,type PublicTrust,type Grant} from '../../experiments/jupiter-beta-approval/integration/contract.mjs';
import {policyInstallation,validatorSdk} from '../../experiments/jupiter-beta-approval/integration/sdk/requests.mjs';
import {researchBoundary} from '../../experiments/jupiter-beta-approval/integration/consumer.mjs';
declare const trust:PublicTrust;
const request:Parameters<TurnkeyClient['stampSignRawPayload']>[0]=rawBody('{}',trust,0);
const policy:Parameters<TurnkeyClient['stampCreatePolicy']>[0]=policyInstallation(trust,0);
const off:false=ACTIVATION;
// @ts-expect-error No configured root daily approver.
const root:true=trust.owner.root;
// @ts-expect-error No native permission in a beta source grant.
const native:true=(null as unknown as Grant).scope.native;
declare const boundary:ReturnType<typeof researchBoundary>;
const r=await boundary.reserve('public envelope','exact mint');
const noActivation:false=r.activate;
// @ts-expect-error No positive outcome authorizes acquisition in this code-only release.
const live:true=r.sourceCalls;
// @ts-expect-error Consumer cannot ask for signatures.
boundary.approve({});
declare const sdk:ReturnType<typeof validatorSdk>;
// @ts-expect-error No wallet or policy-admin method is exposed by the validator adapter.
sdk.signTransaction({});
void [request,policy,off,root,native,noActivation,live];
