export const NAV_ITEMS = [
  { to: "/", label: "Terminal" },
  { to: "/tape", label: "Tape" },
  { to: "/pulse", label: "Pulse" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/explore", label: "Explore" },
  { to: "/methodology", label: "Methodology" },
  { to: "/api", label: "API" },
  { to: "/operators", label: "Operators" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
