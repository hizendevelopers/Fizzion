export type NavItem = {
  href: string;
  key: string;
  children?: NavItem[];
};

export const primaryNavigation: NavItem[] = [
  { href: "/executive-overview", key: "overview" },
  { href: "/tv/channels", key: "tv" },
  { href: "/social-intelligence", key: "social" },
  { href: "/web-advertising", key: "web" },
  {
    href: "/ooh-intelligence",
    key: "ooh",
    children: [
      { href: "/ooh-intelligence", key: "oohMap" },
      { href: "/ooh-intelligence", key: "oohLocations" },
      { href: "/ooh-intelligence/assets/new", key: "oohAddLocation" },
    ],
  },
  { href: "/creatives", key: "creatives" },
  { href: "/campaigns", key: "campaigns" },
  {
    href: "/brands",
    key: "brands",
    children: [
      { href: "/brands", key: "brandsList" },
      { href: "/products", key: "products" },
    ],
  },
  { href: "/reports", key: "reports" },
  { href: "/alerts", key: "alerts" },
  { href: "/data-quality", key: "dataQuality" },
  {
    href: "/admin/users",
    key: "admin",
    children: [
      { href: "/admin/users", key: "adminUsers" },
      { href: "/admin/roles", key: "adminRoles" },
      { href: "/admin/integrations", key: "adminIntegrations" },
      { href: "/admin/sources", key: "adminSources" },
      { href: "/admin/retention", key: "adminRetention" },
      { href: "/admin/audit-logs", key: "adminAuditLogs" },
      { href: "/admin/system-health", key: "adminSystemHealth" },
    ],
  },
];
