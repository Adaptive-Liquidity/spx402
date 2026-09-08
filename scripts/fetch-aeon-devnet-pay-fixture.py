"""Fetch a documented AEON devnet tx as a golden replay fixture (read-only)."""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

# Documented in Adaptive-Liquidity/aeon-program docs/DEVNET.md (v0.2 pay smoke).
SIG = "5y6UGJMUyN4bFVLxriWMiP9gPJVZs8qM6XcbZ5tLa47s38wP9kyxvc2jnEwc6eApj5GZWkhmqNY53BFFuLMue7Sz"
RPC = "https://api.devnet.solana.com"
OUT = Path(__file__).resolve().parents[1] / "src" / "lib" / "indexer" / "__tests__" / "fixtures" / "aeon-devnet-pay.json"


def main() -> None:
    body = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTransaction",
            "params": [
                SIG,
                {
                    "encoding": "json",
                    "maxSupportedTransactionVersion": 0,
                    "commitment": "confirmed",
                },
            ],
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        RPC,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    if payload.get("error"):
        raise SystemExit(payload["error"])
    if not payload.get("result"):
        raise SystemExit("transaction not found on devnet")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"signature": SIG, "rpc": payload["result"]}, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
