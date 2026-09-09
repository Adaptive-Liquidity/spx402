/** Collect Helius webhook/backfill addresses. Never includes the AEON program ID. */

export interface HeliusWatchAgent {
  mint?: string | null;
  deposit_address?: string | null;
  executor_wallet?: string | null;
  core_asset?: string | null;
  aeon_cri_address?: string | null;
  aeon_authority_addresses?: string[] | null;
  aeon_bond_addresses?: string[] | null;
}

function addAddr(into: Set<string>, value: string | null | undefined): void {
  if (typeof value === "string" && value.length > 0) into.add(value);
}

/** Wallet, CRI, known PDAs, mint/deposit/core — not the AEON program. */
export function collectHeliusAccountAddresses(
  agents: HeliusWatchAgent[],
  extra: string[] = [],
): string[] {
  const addrs = new Set<string>();
  for (const value of extra) addAddr(addrs, value);
  for (const agent of agents) {
    addAddr(addrs, agent.mint);
    addAddr(addrs, agent.deposit_address);
    addAddr(addrs, agent.executor_wallet);
    addAddr(addrs, agent.core_asset);
    addAddr(addrs, agent.aeon_cri_address);
    for (const value of agent.aeon_authority_addresses ?? []) addAddr(addrs, value);
    for (const value of agent.aeon_bond_addresses ?? []) addAddr(addrs, value);
  }
  return Array.from(addrs);
}
