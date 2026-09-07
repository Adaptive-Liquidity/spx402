export const NAV_ITEMS = [
  { to: "/registry", label: "Leaderboard" },
  { to: "/registry/explore", label: "Registry" },
  { to: "/build/register", label: "Register Agent" },
  { to: "/aeon-agents", label: "AEON Agents" },
  { to: "/methodology", label: "Methodology" },
  { to: "/corrections", label: "Corrections" },
  { to: "/genesis-record", label: "Genesis Record" },
  { to: "/build/docs", label: "API" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

/** Signed-in navigation for the operator terminal. */
export const DASHBOARD_NAV_ITEMS = [
  { to: "/dashboard/agents", label: "My Agents" },
  { to: "/dashboard/wallets", label: "Wallets" },
  { to: "/dashboard/watchlist", label: "Watchlist" },
  { to: "/dashboard/alerts", label: "Alerts" },
  { to: "/dashboard/api-keys", label: "API Keys" },
  { to: "/dashboard/account", label: "Settings" },
] as const;
