#!/usr/bin/env python3
"""Append sourced, timestamped StonkFun reward snapshots; never synthesize history."""
import datetime as dt
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
MINTS = ROOT / "data" / "tracked-mints.json"
OUT = ROOT / "data" / "reward-snapshots.json"
MAX_POINTS = 24 * 90

def fetch(mint):
    url = f"https://www.stonkfun.xyz/api/public/v1/tokens/{mint}/rewards"
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "SCOUT-Research/1.0"})
    with urllib.request.urlopen(req, timeout=15) as response:
        raw = json.load(response)
    data = raw.get("data", raw) if isinstance(raw, dict) else {}
    if not isinstance(data, dict):
        raise ValueError("Invalid API response")
    rewards = data.get("rewards")
    if not isinstance(rewards, dict):
        raise ValueError("No rewards object")
    amount = rewards.get("distributedTokens")
    if isinstance(amount, bool) or not isinstance(amount, (int, float)) or not (0 <= amount < float("inf")):
        raise ValueError("Missing or invalid distributedTokens")
    return {"distributedTokens": amount,
            "payoutCount": rewards.get("payoutCount") if type(rewards.get("payoutCount")) is int else None,
            "holderCount": rewards.get("holderCount") if type(rewards.get("holderCount")) is int else None,
            "quoteSymbol": (data.get("quote") or {}).get("symbol"),
            "source": url}

def main():
    mints = json.loads(MINTS.read_text())
    if not isinstance(mints, list) or len(mints) > 25:
        raise ValueError("Invalid tracked mint list")
    records = json.loads(OUT.read_text()) if OUT.exists() else {}
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    success = 0
    for mint in mints:
        if not isinstance(mint, str) or not 32 <= len(mint) <= 44:
            continue
        try:
            record = {"observedAt": now, **fetch(mint)}
            history = records.setdefault(mint, [])
            if history and record["distributedTokens"] < history[-1]["distributedTokens"]:
                print(f"Skipping reset/decrease for {mint}; manual review required")
                continue
            history.append(record)
            records[mint] = history[-MAX_POINTS:]
            success += 1
        except Exception as exc:
            print(f"Could not collect {mint}: {exc}")
    if not success:
        raise RuntimeError("No verified snapshots collected")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n")
    print(f"Recorded {success} reward snapshot(s) at {now}")

if __name__ == "__main__":
    main()
