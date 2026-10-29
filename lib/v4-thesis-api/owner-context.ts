import type {VerifiedOwner} from '../v4-private-journal/auth';
/** TYPE ONLY. Agent A #227 supplies verification/one-owner allowlist and revocation.
 * Principal must belong to the SAME OwnerAuthority used by repository/rate adapter. */
export type VerifiedOwnerContext=Readonly<{principal:VerifiedOwner;sessionTag:string;expiresAtMs:number}>;
export interface VerifiedOwnerContextPort {
 resolve(request:Request):Promise<VerifiedOwnerContext|null>;
 verifyCsrf(request:Request,context:VerifiedOwnerContext):Promise<boolean>;
 isCurrent(context:VerifiedOwnerContext):Promise<boolean>;
}
