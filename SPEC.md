# SCOUT — Stonk Ecosystem Intelligence

## Mission
Make StonkFun reward activity transparent and independently verifiable. This is a read-only analytics product, not a trading tool or token launch.

## MVP: Reward Reality Check
Users paste a Solana token mint address. The app displays:
- Token name, mint, quote/reward asset, and source links (when verified)
- Observed reward distributions over a clearly labeled time window
- Reward value and token price change **separately**
- Liquidity and volume with timestamps when reliable sources exist
- Data freshness, methodology, and missing-data warnings

## Calculation principles
- Do not call annualized recent payout rates guaranteed APY.
- Do not infer an individual holder's profit from token-level payout totals.
- Wallet-level realized returns require acquisition cost, distributions, fees, and sale proceeds.
- Never fabricate unavailable API values; display `Unavailable`.

## Safety and scope
- No wallet connection, transaction signing, buy/sell buttons, price targets, or automated trading.
- No STORK token requirement and no new token launch.
- No paid rankings or undisclosed promotional placements.
- Do not expose secrets in the frontend or commit credentials.

## 72-hour milestones
1. Mobile-first Next.js site, token input, validated Solana address, clear empty/error/loading states, source attribution.
2. Connect one reliable read-only data source; display observed rewards and context; document methodology.
3. Deploy, test with a small set of known tokens, publish limitations and solicit user feedback.

## Definition of done
A visitor can open the site on mobile, enter a mint, and understand what was actually verified versus what remains unknown. No misleading yield claims.
