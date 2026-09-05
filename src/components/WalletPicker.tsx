import { useEffect, useState } from "react";
import { watchWallets, type DetectedWallet } from "@/lib/wallets";

interface Props {
  /** Called when the user picks a wallet. Parent runs connect + sign-in. */
  onSelect: (wallet: DetectedWallet) => void;
  disabled?: boolean;
}

/**
 * Multi-wallet picker. Lists every EIP-6963 detected wallet with its real
 * name and icon. No accounts are read until the user picks one.
 */
export function WalletPicker({ onSelect, disabled }: Props) {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);

  useEffect(() => watchWallets(setWallets), []);

  if (wallets.length === 0) {
    return (
      <div className="border border-bronze/40 bg-panel-deep px-4 py-3 text-center font-mono text-xs text-paper-muted">
        No wallet detected in this browser. Install{" "}
        <a
          href="https://www.coinbase.com/wallet"
          target="_blank"
          rel="noreferrer"
          className="text-amber hover:underline"
        >
          Coinbase Wallet
        </a>
        ,{" "}
        <a
          href="https://phantom.com"
          target="_blank"
          rel="noreferrer"
          className="text-amber hover:underline"
        >
          Phantom
        </a>
        ,{" "}
        <a
          href="https://metamask.io"
          target="_blank"
          rel="noreferrer"
          className="text-amber hover:underline"
        >
          MetaMask
        </a>{" "}
        or any Base-compatible wallet, then refresh.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {wallets.map((w) => (
        <button
          key={w.uuid}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(w)}
          className="flex w-full items-center gap-3 border border-bronze/60 bg-panel-deep px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-paper hover:border-amber hover:text-amber disabled:opacity-50"
        >
          {w.icon ? (
            <img src={w.icon} alt="" className="h-5 w-5 rounded-sm" aria-hidden="true" />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-bronze/60 text-[10px] text-amber">
              {w.name.slice(0, 1)}
            </span>
          )}
          <span className="flex-1">{w.name}</span>
          <span className="text-wire">→</span>
        </button>
      ))}
    </div>
  );
}
