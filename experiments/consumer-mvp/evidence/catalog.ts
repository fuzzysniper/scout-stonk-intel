/** Deliberate support boundary. Labels never enroll another mint. Changes require review. */
export const IDENTITIES = [
  {
    mint: "DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP",
    symbol: "SI", name: "Super Inu",
    quoteMint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
    quoteSymbol: "NVDAX", quoteName: "NVIDIA", quoteDecimals: 8,
    poolMint: "5aBH535rESkhjVb2nEaMPfyjiTw3uK57vE6c5uhZHjPY",
    catalogPacket: 3, rewardsPacket: 8,
  },
  {
    mint: "HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ",
    symbol: "GP", name: "RuneScape Gold",
    quoteMint: "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re",
    quoteSymbol: "GLDX", quoteName: "GOLD", quoteDecimals: 8,
    poolMint: "FE1kGMg4PCLbbz2AMBaHSiG3USXpVNtUVKDFrC7E3fco",
    catalogPacket: 4, rewardsPacket: 12,
  },
  {
    mint: "6HU4CmRb15C2nQDx8Ld2f2W2wTdmog6aZiiXdrT5Pzi8",
    symbol: "GROK", name: "Grokification",
    quoteMint: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
    quoteSymbol: "SPCXX", quoteName: "SPACEX", quoteDecimals: 8,
    poolMint: "31jrCKZgiqcGvEYnditbXQgWyYynogot7xfgtRASimuh",
    catalogPacket: 5, rewardsPacket: 17,
  },
] as const;

export const ORIGIN = "https://www.stonkfun.xyz";
export const REGISTRY_PATH = "/api/public/v1/pairs";
export const CATALOG_PATH = "/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25&quoteMint=";
export const CAPTURE = {
  commit: "df4e87658c5dd64fef9461d174333d824c8b1c7c",
  path: "docs/evidence/pair-reward-audit-2026-10-14.json",
  documentSha256: "4ff3c223122ca1479bade0e09889aa4837803cab137c26a9e714999a2ea0b50d",
} as const;
export const QUOTE_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
/** Conservative explanation-age limit, not a provider SLA or live-value certification. */
export const MAX_AGE_SECONDS = 600;
