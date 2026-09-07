/** Primary header navigation. Kept to six items so it never wraps at 1280px. */
export const NAV_ITEMS = [
  { to: "/registry", label: "Leaderboard" },
  { to: "/registry/explore", label: "Registry" },
  { to: "/build/register", label: "Register Agent" },
  { to: "/aeon-agents", label: "AEON Agents" },
  { to: "/methodology", label: "Methodology" },
  { to: "/build/docs", label: "API" },
] as const;

/** Full index used by the mobile drawer, where vertical space is not scarce. */
export const MOBILE_NAV_ITEMS = [
  ...NAV_ITEMS,
  { to: "/corrections", label: "Corrections" },
  { to: "/genesis-record", label: "Genesis Record" },
  { to: "/live", label: "Execution Tape" },
  { to: "/live/status", label: "System Status" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
