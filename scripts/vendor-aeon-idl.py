"""Download Adaptive-Liquidity/aeon-program IDL into src/lib/indexer/idl/aeon.json."""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

URL = "https://raw.githubusercontent.com/Adaptive-Liquidity/aeon-program/main/client/idl/aeon.json"
OUT = Path(__file__).resolve().parents[1] / "src" / "lib" / "indexer" / "idl" / "aeon.json"

EXPECTED_ADDRESS = "TcZ9MKNw4eGvoe3K75e4M3zCwZCzEsb6WvrS8LqNgdm"
EXPECTED_IX_COUNT = 20


def main() -> None:
    with urllib.request.urlopen(URL, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if data.get("address") != EXPECTED_ADDRESS:
        raise SystemExit(f"unexpected IDL address {data.get('address')}")
    n = len(data.get("instructions") or [])
    if n != EXPECTED_IX_COUNT:
        raise SystemExit(f"expected {EXPECTED_IX_COUNT} instructions, got {n}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes, {n} instructions)")


if __name__ == "__main__":
    main()
