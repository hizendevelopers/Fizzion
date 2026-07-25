export type ModuleDefinition = {
  title: string;
  description: string;
  status: string;
  dependencies: string[];
  capabilities: string[];
};

export const moduleDefinitions: Record<string, ModuleDefinition> = {
  overview: {
    title: "Overview",
    description:
      "Cross-media command center for Iraqi advertising activity, source health, competitor movement, and creative discovery.",
    status: "Executive command center",
    dependencies: [
      "Verified source feeds for TV, social, websites, and OOH",
      "Supabase project with production RLS and seed data",
      "Signed media storage and dashboard query materialization",
    ],
    capabilities: [
      "Cross-media KPI rollups with non-misleading metric separation",
      "Share-of-voice and freshness monitoring",
      "New creative discovery and risk summary",
      "Top channels, websites, and campaigns once live data is available",
    ],
  },
  tv: {
    title: "TV",
    description:
      "Monitor Iraqi linear television with verified recordings, ad occurrence detection, five-second context clips, review queues, and channel-health monitoring.",
    status: "TV ingestion foundation",
    dependencies: [
      "Authorized Iraqi recording partner and upload credentials",
      "FFmpeg and media-ai workers deployed to ECS",
      "Clip storage, signed playback, and review workflow activation",
    ],
    capabilities: [
      "Recording intake validation and gap tracking",
      "Occurrence-level clips with 5s pre-roll and 5s post-roll",
      "Human review for medium-confidence and unknown creatives",
      "Channel health, timeline review, and occurrence exports",
    ],
  },
  social: {
    title: "Social Intelligence",
    description:
      "Track owned and public social accounts through a connector architecture that clearly separates authorized analytics from legitimately public metrics.",
    status: "Connector-ready social shell",
    dependencies: [
      "Approved OAuth apps for Meta, YouTube, TikTok, and X",
      "Platform-specific scopes and account authorization",
      "Scheduled sync workers and raw payload retention",
    ],
    capabilities: [
      "Owned-versus-public connection type enforcement",
      "Availability-aware metric rendering",
      "Content feed, comparisons, and synchronization visibility",
      "Token-health and connector-failure alerting",
    ],
  },
  websites: {
    title: "Web",
    description:
      "Run Iraq-local website crawls, detect display units and native ads, preserve screenshot context, and deduplicate creatives while keeping every occurrence.",
    status: "Crawler orchestration shell",
    dependencies: [
      "Iraq-geolocated browser node or approved proxy",
      "Configured website list and crawl schedules",
      "Playwright worker deployment with screenshot storage",
    ],
    capabilities: [
      "Configurable crawl intervals and page-depth rules",
      "Contextual ad screenshots and detection provenance",
      "Creative deduplication across repeated captures",
      "Website-level health and failure tracking",
    ],
  },
  ooh: {
    title: "OOH Intelligence",
    description:
      "Manage manual OOH inventory, location mapping, vendor assignments, verification visits, and proof-of-display evidence.",
    status: "Manual inventory workflow",
    dependencies: [
      "Approved user roles for OOH operations",
      "Map provider configuration",
      "Secure upload storage for location and proof photos",
    ],
    capabilities: [
      "Map, list, gallery, and campaign views",
      "Vendor and assignment tracking",
      "Verification visits with GPS and timestamp lineage",
      "Expiry and availability management",
    ],
  },
  creatives: {
    title: "Creative Library",
    description:
      "Unify TV, social, website, and OOH creative identities so reviewers and analysts can track master assets, variants, transcripts, OCR, and occurrence history.",
    status: "Cross-media identity library",
    dependencies: [
      "Embeddings and fingerprint generation services",
      "Variant ingestion from each media module",
      "Reviewer workflows for merges and splits",
    ],
    capabilities: [
      "Cross-media creative identity and variant grouping",
      "Search by transcript, OCR, brand, and campaign",
      "Authorized asset download and occurrence drill-down",
      "Duplicate merge and split audit trail",
    ],
  },
  campaigns: {
    title: "Campaigns",
    description:
      "Manage the reusable campaign model linking brands, products, agencies, keywords, hashtags, dates, and media-type expectations across the platform.",
    status: "Campaign management shell",
    dependencies: [
      "Brand and product master data setup",
      "Org-specific permissions and RLS",
      "Operational links from TV, social, web, and OOH modules",
    ],
    capabilities: [
      "Campaign metadata and lifecycle management",
      "Expected-creative tracking",
      "Cross-media mapping and report scoping",
      "Permission-controlled commercial fields",
    ],
  },
  brands: {
    title: "Brands and Competitors",
    description:
      "Maintain Coca-Cola, competitors, aliases, OCR keywords, speech cues, and owned domains so detection and reporting stay configurable rather than hardcoded.",
    status: "Brand master data shell",
    dependencies: [
      "Admin-managed brand governance",
      "OCR, transcript, and domain matching pipelines",
      "Creative and campaign mapping rules",
    ],
    capabilities: [
      "English and Arabic aliases",
      "Keyword, domain, and handle-based matching",
      "Competitor grouping and active-state controls",
      "Cross-media identity normalization",
    ],
  },
  reports: {
    title: "Reports",
    description:
      "Create reusable report templates, background export runs, scheduled deliveries, and audit-ready download records for stakeholders.",
    status: "Background reporting shell",
    dependencies: [
      "Report worker deployment and export storage",
      "Brand-safe PDF and image asset generation",
      "Notification channels for completion and failure",
    ],
    capabilities: [
      "Template-based export jobs",
      "CSV, XLSX, PDF, JSON, and image asset outputs",
      "Scheduled delivery and audit logs",
      "Progress tracking for large report runs",
    ],
  },
  alerts: {
    title: "Alerts",
    description:
      "Trigger and manage operational and intelligence alerts such as missing recordings, crawler failures, new creatives, token expiry, and backlog spikes.",
    status: "Alerting command center",
    dependencies: [
      "Alert rules persisted in Supabase",
      "Slack, Teams, or email delivery credentials",
      "Health rollups from workers and connectors",
    ],
    capabilities: [
      "Severity, assignment, acknowledgement, and notes",
      "Intelligence and operational alert types",
      "Multi-channel notification delivery",
      "Data-quality integration and escalation history",
    ],
  },
  dataQuality: {
    title: "Data Quality",
    description:
      "Expose source uptime, missing periods, crawl health, token health, latency, duplicate rates, and provenance so teams can trust the analytics surface.",
    status: "Operational trust center",
    dependencies: [
      "Structured worker logs and processing telemetry",
      "Queue depth metrics and source heartbeat capture",
      "Reviewer backlog and provenance persistence",
    ],
    capabilities: [
      "Source and connector health visibility",
      "Latency and backlog monitoring",
      "Unknown-brand and confidence distribution tracking",
      "Storage and failed-job observability",
    ],
  },
  admin: {
    title: "Administration",
    description:
      "Configure users, roles, integrations, sources, retention policies, audit trails, and system-health controls across organizations.",
    status: "Governance workspace",
    dependencies: [
      "Supabase Auth, MFA, and RLS",
      "Integration credentials and secrets management",
      "Audit-log retention and system policy controls",
    ],
    capabilities: [
      "Role and permission management",
      "Integration activation and health checks",
      "Retention policies and deletion controls",
      "Complete audit visibility for privileged actions",
    ],
  },
};
