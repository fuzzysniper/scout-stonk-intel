// SYNTHETIC FORMAT FIXTURES ONLY. Addresses identify test inputs, not observed mint facts.
export const MINT = "DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP";
export const OTHER = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const THIRD = "11111111111111111111111111111111";
export const FOURTH = "So11111111111111111111111111111111111111112";
export const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const TIME = "2026-10-18T12:00:00.000Z";
export function envelope() {
  return { jsonrpc: "2.0", id: 1, result: { context: { slot: 400000001, apiVersion: "3.0.0" }, value: {
    owner: TOKEN, executable: false, lamports: 1461600, rentEpoch: 0,
    data: { program: "spl-token", space: 82, parsed: { type: "mint", info: {
      mintAuthority: OTHER, freezeAuthority: null, supply: "18446744073709551615", decimals: 9, isInitialized: true,
    } } },
  } } };
}
export function token2022() {
  const e = envelope(); e.result.value.owner = TOKEN2022; e.result.value.data.program = "spl-token-2022"; return e;
}
export function capture(e = envelope(), extra = {}) {
  return { mint: MINT, requestId: 1, text: JSON.stringify(e), requestStartedAt: TIME,
    responseReceivedAt: TIME, evaluatedAt: TIME, captureKind: "synthetic_fixture", ...extra };
}
export function response(e = envelope(), options = {}) {
  return new Response(JSON.stringify(e), { headers: { "content-type": "application/json" }, ...options });
}
