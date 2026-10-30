/** Owner-approved Ed25519 PUBLIC key for immutable private-preview release verification.
 * Fingerprint (SHA-256 of SubjectPublicKeyInfo DER):
 * 48a34ef44033ad8a6654116f211bbe9923abf05d01385c02d3713722f2c6c055
 * Only a separately signed, exact-deployment release can admit runtime capabilities.
 * Never add the private key to this repository or an environment variable used for verification.
 */
export const OWNER_RELEASE_PUBLIC_KEY_PEM:string|null=`-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAbbrF+IJv9HpPRtP5B1a4OfA+6/9U8CP66d4u1tKxiQ4=
-----END PUBLIC KEY-----
`;
export const VERCEL_PROJECT_ID='prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q';
