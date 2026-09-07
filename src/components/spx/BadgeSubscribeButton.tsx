// Operator badge checkout — USDC on Base, caller-funded, honestly graded.

import { useEffect, useState } from "react";
import { encodeFunctionData, parseAbi } from "viem";
import { watchWallets, type DetectedWallet, type InjectedProvider } from "@/lib/wallets";
import { BASE_CHAIN_ID_HEX, BASE_USDC, formatUsdc } from "@/lib/plans";
import { BADGE_TIERS, HONEST_GRADE_RULE, type BadgeTier } from "@/lib/badge-plans";
import { checkBadgeSubject, getBadgePlans, subscribeBadge } from "@/lib/badge.functions";
import { useAuth } from "@/lib/auth";

const ERC20 = parseAbi(["function transfer(address to, uint256 value) returns (bool)"]);

const BASE_CHAIN_PARAMS = {
  chainId: BASE_CHAIN_ID_HEX,
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
};

async function ensureBase(provider: InjectedProvider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_ID_HEX }],
    });
  } catch {
    await provider.request({ method: "wallet_addEthereumChain", params: [BASE_CHAIN_PARAMS] });
  }
}

export interface BadgeSubscribeButtonProps {
  mint: string;
  tier: BadgeTier;
  onSubscribed?: (grantedUntil: string) => void;
}

export function BadgeSubscribeButton({ mint, tier, onSubscribed }: BadgeSubscribeButtonProps) {
  const spec = BADGE_TIERS[tier];
  const { session, loading: authLoading } = useAuth();
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [payTo, setPayTo] = useState<string | null | undefined>(undefined);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => watchWallets(setWallets), []);
  useEffect(() => {
    void getBadgePlans()
      .then((c) => setPayTo(c.payTo))
      .catch(() => setPayTo(null));
  }, []);

  const pay = async (wallet: DetectedWallet) => {
    setPicking(false);
    setError(null);
    setBusy(true);
    try {
      if (!payTo) throw new Error("Badge subscriptions are not configured yet.");

      // Everything that can fail is checked BEFORE the wallet is charged:
      // an on-chain USDC transfer cannot be undone if activation then fails.
      if (!session) {
        throw new Error("Sign in to SPX402 before paying — the badge is tied to your account.");
      }
      setStatus("Checking the agent…");
      const subject = await checkBadgeSubject({ data: { mint } });
      if (!subject.exists) {
        throw new Error(
          "That agent is not on the SPX402 terminal, so nothing was charged. Check the identifier on its dossier.",
        );
      }

      setStatus("Connecting wallet…");
      const accounts = (await wallet.provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const from = accounts?.[0];
      if (!from) throw new Error("No account returned by the wallet.");

      setStatus("Switching to Base…");
      await ensureBase(wallet.provider);

      setStatus(`Approving ${formatUsdc(spec.priceUsdc)} USDC…`);
      const txHash = (await wallet.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: BASE_USDC,
            data: encodeFunctionData({
              abi: ERC20,
              functionName: "transfer",
              args: [payTo as `0x${string}`, BigInt(spec.priceUsdc)],
            }),
          },
        ],
      })) as string;

      setStatus("Waiting for confirmations…");
      let result = await subscribeBadge({ data: { txHash, mint, tier } });
      for (let i = 0; i < 10 && !result.ok && /confirm|not found/i.test(result.error ?? ""); i++) {
        await new Promise((r) => setTimeout(r, 3000));
        result = await subscribeBadge({ data: { txHash, mint, tier } });
      }
      if (!result.ok) {
        throw new Error(
          `${result.error ?? "Payment could not be verified"} — payment ${txHash} is on Base; send this hash to support@spx402.com and we will activate or refund it.`,
        );
      }

      setStatus(
        result.attestation?.uid
          ? `Badge live · attested on Base until ${result.grantedUntil!.slice(0, 10)}`
          : `Badge live until ${result.grantedUntil!.slice(0, 10)} · attestation queued`,
      );
      onSubscribed?.(result.grantedUntil!);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      setError(/user rejected|denied/i.test(msg) ? "Payment cancelled in the wallet." : msg);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setPicking((v) => !v)}
        disabled={busy || authLoading || !session || payTo === null}
        className="w-full border border-amber bg-amber px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-panel-deep hover:bg-amber-dim disabled:opacity-50"
      >
        {busy
          ? (status ?? "Working…")
          : !authLoading && !session
            ? "Sign in to activate a badge"
            : payTo === null
            ? "Badge subscriptions unavailable"
            : `${spec.name} · ${formatUsdc(spec.priceUsdc)} USDC / 30 days`}
      </button>

      {picking && (
        <div className="border border-bronze/50 bg-panel-deep/60 p-3">
          {wallets.length === 0 ? (
            <p className="font-mono text-[11px] text-paper-muted">
              No browser wallet detected. Install Coinbase Wallet, Phantom, or MetaMask, then
              reload.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {wallets.map((w) => (
                <li key={w.uuid}>
                  <button
                    type="button"
                    onClick={() => void pay(w)}
                    className="flex w-full items-center gap-2.5 border border-bronze/50 px-3 py-2 text-left font-mono text-xs text-paper hover:border-amber hover:text-amber"
                  >
                    {w.icon && <img src={w.icon} alt="" className="h-4 w-4" />}
                    {w.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {status && !busy && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-verified">{status}</p>
      )}
      {error && (
        <p className="border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-[11px] text-critical">
          {error}
        </p>
      )}

      <p className="font-mono text-[10px] leading-relaxed text-wire">{HONEST_GRADE_RULE}</p>
    </div>
  );
}
