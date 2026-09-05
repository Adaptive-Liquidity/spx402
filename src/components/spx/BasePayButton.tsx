// Base Pay — one tap, USDC on Base, settled by the caller's own wallet.
// SPX402 sponsors no gas: the wallet pays its own execution fees.

import { useEffect, useState } from "react";
import { encodeFunctionData, parseAbi } from "viem";
import { watchWallets, type DetectedWallet, type InjectedProvider } from "@/lib/wallets";
import {
  BASE_CHAIN_ID_HEX,
  BASE_USDC,
  formatUsdc,
  PLANS,
  type PlanId,
} from "@/lib/plans";
import { getBasePayConfig, redeemPlanPayment } from "@/lib/base-pay.functions";

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

export interface BasePayButtonProps {
  plan: PlanId;
  /** API key to upgrade with this payment, if any. */
  apiKeyId?: string | null;
  onPaid?: (result: { plan: PlanId; grantedUntil: string; dailyLimit: number }) => void;
}

export function BasePayButton({ plan, apiKeyId = null, onPaid }: BasePayButtonProps) {
  const spec = PLANS[plan];
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [config, setConfig] = useState<{ payTo: string | null; onrampAppId: string | null } | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => watchWallets(setWallets), []);
  useEffect(() => {
    void getBasePayConfig()
      .then((c) => setConfig({ payTo: c.payTo, onrampAppId: c.onrampAppId }))
      .catch(() => setConfig({ payTo: null, onrampAppId: null }));
  }, []);

  const pay = async (wallet: DetectedWallet) => {
    setPicking(false);
    setError(null);
    setBusy(true);
    try {
      if (!config?.payTo) throw new Error("Payments are not configured yet.");
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
              args: [config.payTo as `0x${string}`, BigInt(spec.priceUsdc)],
            }),
          },
        ],
      })) as string;

      setStatus("Waiting for confirmations…");
      let result = await redeemPlanPayment({ data: { txHash, plan, apiKeyId } });
      for (let i = 0; i < 10 && !result.ok && /confirm|not found/i.test(result.error ?? ""); i++) {
        await new Promise((r) => setTimeout(r, 3000));
        result = await redeemPlanPayment({ data: { txHash, plan, apiKeyId } });
      }
      if (!result.ok) throw new Error(result.error ?? "Payment could not be verified");

      setStatus(`${spec.name} active until ${result.grantedUntil!.slice(0, 10)}`);
      onPaid?.({
        plan,
        grantedUntil: result.grantedUntil!,
        dailyLimit: result.dailyLimit!,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      setError(/user rejected|denied/i.test(msg) ? "Payment cancelled in the wallet." : msg);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const onrampUrl =
    config?.onrampAppId && config.payTo
      ? `https://pay.coinbase.com/buy/select-asset?appId=${encodeURIComponent(config.onrampAppId)}&defaultAsset=USDC&defaultNetwork=base&presetFiatAmount=${Math.ceil(spec.priceUsdc / 1_000_000)}&fiatCurrency=USD`
      : null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setPicking((v) => !v)}
        disabled={busy || config?.payTo === null}
        className="w-full border border-amber bg-amber px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-panel-deep hover:bg-amber-dim disabled:opacity-50"
      >
        {busy
          ? (status ?? "Working…")
          : config?.payTo === null
            ? "Base Pay unavailable"
            : `Pay ${formatUsdc(spec.priceUsdc)} USDC on Base`}
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

      {onrampUrl && (
        <a
          href={onrampUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="block border border-bronze/60 px-4 py-2.5 text-center font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
        >
          Empty wallet? Fund with card or Apple Pay →
        </a>
      )}

      <p className="font-mono text-[10px] leading-relaxed text-wire">
        Settlement is caller-funded. Your wallet pays the USDC and its own Base gas — SPX402 runs no
        paymaster and sponsors nothing.
      </p>
    </div>
  );
}
