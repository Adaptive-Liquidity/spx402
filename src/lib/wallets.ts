// EIP-6963 wallet discovery — browser-only helpers.
// Wallets announce themselves via the `eip6963:announceProvider` event.
// This gives us real wallet names + icons for every installed wallet,
// with zero tracking and no SDK.

export interface InjectedProvider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
}

export interface DetectedWallet {
  /** Stable id from the wallet (EIP-6963 uuid). */
  uuid: string;
  /** Human-readable name, e.g. "Phantom", "MetaMask", "Coinbase Wallet". */
  name: string;
  /** Data-URI icon supplied by the wallet, if any. */
  icon: string | null;
  provider: InjectedProvider;
}

interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon?: string;
  rdns?: string;
}

interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: InjectedProvider;
}

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<Eip6963ProviderDetail>;
  }
}

/**
 * Listen for announced wallets. Returns an unsubscribe function.
 * Fires `onChange` with the deduplicated list whenever it changes.
 */
export function watchWallets(onChange: (wallets: DetectedWallet[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const found = new Map<string, DetectedWallet>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const emit = () => {
    if (timer) return; // debounce bursts during initial announce flood
    timer = setTimeout(() => {
      timer = null;
      onChange([...found.values()]);
    }, 50);
  };

  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
    if (!detail?.info?.uuid || !detail.provider) return;
    if (found.has(detail.info.uuid)) return;
    found.set(detail.info.uuid, {
      uuid: detail.info.uuid,
      name: detail.info.name || "Unknown wallet",
      icon: detail.info.icon ?? null,
      provider: detail.provider,
    });
    emit();
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  // Ask all installed wallets to announce themselves.
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  // Legacy fallback: a single injected window.ethereum with no EIP-6963 support.
  setTimeout(() => {
    const legacy = (window as unknown as { ethereum?: InjectedProvider }).ethereum;
    if (legacy && found.size === 0) {
      found.set("legacy-window-ethereum", {
        uuid: "legacy-window-ethereum",
        name: "Browser wallet",
        icon: null,
        provider: legacy,
      });
      emit();
    }
  }, 300);

  return () => {
    window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
    if (timer) clearTimeout(timer);
  };
}
