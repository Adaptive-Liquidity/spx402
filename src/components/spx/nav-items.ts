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
