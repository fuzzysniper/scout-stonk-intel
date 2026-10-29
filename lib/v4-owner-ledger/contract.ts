import type { OwnerIdentityPort } from '../v4-helius-pilot/server/contract';
/** Runtime capabilities are WeakMap-bound, not serialized client credentials. */
declare const ownerContext: unique symbol;
export type VerifiedOwnerContext = Readonly<{ [ownerContext]: true }>;
export type VerifiedOwnerClaims = Readonly<{
  ownerSubject: string; journalOwnerId: string; issuer: string; audience: string;
  sessionId: string; authenticatedAt: number; verifiedAt: number; expiresAt: number;
}>;
/** Shared type-only seam for B. Never cast into legacy OwnerAuthority. No route is wired here. */
export type VerifiedOwnerPort = Readonly<{
  verify(request: Request): Promise<VerifiedOwnerContext | null>;
  inspect(context: unknown): VerifiedOwnerClaims | null;
}>;
export type OwnerPolicy = Readonly<{
  issuer: string; audience: string; ownerSubject: string; journalOwnerId: string;
}>;
export type OwnerBoundary = VerifiedOwnerPort & Readonly<{
  pilot(profile: unknown): OwnerIdentityPort;
}>;
