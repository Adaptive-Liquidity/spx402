export const NAV_ITEMS = [
  { to: "/", label: "Terminal" },
  { to: "/live", label: "Live" },
  { to: "/registry", label: "Registry" },
  { to: "/build", label: "Build" },
  { to: "/methodology", label: "Methodology" },
  { to: "/about", label: "About" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
