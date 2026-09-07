/**
 * Primary navigation, grouped into four hubs. The desktop header renders each
 * hub as a dropdown; the mobile drawer renders the same groups as sections.
 * Every entry points at a route that already exists — no aliases, no stubs.
 */
export const NAV_HUBS = [
  {
    label: "Live",
    to: "/live",
    items: [
      { to: "/live", label: "Tape" },
      { to: "/live/pulse", label: "Pulse" },
      { to: "/live/status", label: "System status" },
    ],
  },
  {
    label: "Registry",
    to: "/registry",
    items: [
      { to: "/registry", label: "Leaderboard" },
      { to: "/registry/explore", label: "Explore" },
      { to: "/registry/flagged", label: "Flagged" },
      { to: "/registry/operators", label: "Operators" },
      { to: "/aeon-agents", label: "AEON Agents" },
    ],
  },
  {
    label: "Build",
    to: "/build",
    items: [
      { to: "/build", label: "API" },
      { to: "/build/register", label: "Register agent" },
      { to: "/build/docs", label: "Endpoints" },
      { to: "/build/badge", label: "Badge" },
      { to: "/build/alerts", label: "Alerts" },
      { to: "/build/preflight", label: "Preflight" },
      { to: "/pricing", label: "Pricing" },
    ],
  },
  {
    label: "About",
    to: "/about",
    items: [
      { to: "/about", label: "About" },
      { to: "/methodology", label: "Methodology" },
      { to: "/corrections", label: "Corrections" },
      { to: "/genesis-record", label: "Genesis Record" },
      { to: "/about/changelog", label: "Changelog" },
      { to: "/about/disclaimer", label: "Disclaimer" },
    ],
  },
] as const;

/** Every route reachable from the palette's Routes group. */
export const NAV_ROUTES: { to: string; label: string }[] = NAV_HUBS.flatMap((hub) => [...hub.items]);

export type NavHub = (typeof NAV_HUBS)[number];
export type NavItem = (typeof NAV_ROUTES)[number];
