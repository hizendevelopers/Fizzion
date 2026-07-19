import { EmptyPanel } from "./empty-panel";
import { KpiCard } from "./kpi-card";

type ModulePageProps = {
  title: string;
  description: string;
  status: string;
  dependencies: string[];
  capabilities: string[];
  copy: {
    noData: string;
    noDataDescription: string;
    externalDependency: string;
    activationRequired: string;
  };
};

export function ModulePage({
  title,
  description,
  status,
  dependencies,
  capabilities,
  copy,
}: ModulePageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/88 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-panel-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">
                {status}
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-panel-soft px-3 py-2 text-xs text-muted-foreground">This month</span>
              <span className="rounded-full bg-panel-soft px-3 py-2 text-xs text-muted-foreground">Baghdad</span>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Sources connected" note="No production source has been activated in this environment yet." tone="soft" />
            <KpiCard label="Approved records" note="Counts will appear only after verified ingestion and review." tone="deep" />
            <KpiCard label="Signal windows" note="Active monitoring windows will appear after source onboarding." tone="warning" />
            <KpiCard label="Operational risk" note="External dependencies are tracked before go-live." tone="brand" />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.55fr_0.75fr]">
            <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Media activity curve</p>
                  <p className="mt-1 text-xs text-muted-foreground">Cross-source operating pattern</p>
                </div>
                <div className="rounded-full bg-panel-soft px-3 py-1 text-xs text-muted-foreground">2026</div>
              </div>
              <div className="mt-6 h-64 rounded-[1.4rem] bg-[linear-gradient(180deg,#fffaf8_0%,#f9f2ee_100%)] p-4">
                <div className="relative h-full overflow-hidden rounded-[1.2rem] border border-border/60 bg-white/70">
                  <div className="absolute inset-x-4 top-1/2 h-px bg-border/60" />
                  <div className="absolute inset-x-4 top-1/4 h-px bg-border/45" />
                  <div className="absolute inset-x-4 bottom-1/4 h-px bg-border/45" />
                  <svg className="absolute inset-0 h-full w-full" fill="none" viewBox="0 0 680 260">
                    <path d="M10 220C40 180 62 96 103 122C150 151 170 208 223 180C280 150 308 66 358 108C413 154 431 212 481 171C530 129 564 65 610 95C640 115 656 160 670 214" stroke="#B00020" strokeWidth="3"/>
                    <path d="M10 208C52 206 73 148 117 163C153 175 190 229 233 201C274 174 300 90 352 83C395 77 433 151 479 150C524 149 557 105 610 117C636 123 653 149 670 189" stroke="#FFAD32" strokeWidth="3"/>
                    <path d="M10 234C52 212 88 209 117 188C163 154 183 101 223 110C272 122 299 224 352 218C402 212 423 115 479 100C528 87 553 171 610 188C631 195 648 208 670 224" stroke="#F40009" strokeWidth="3"/>
                    <circle cx="358" cy="108" r="6" fill="#F40009"/>
                    <circle cx="479" cy="150" r="6" fill="#FFAD32"/>
                    <circle cx="610" cy="95" r="6" fill="#B00020"/>
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <LegendDot color="bg-brand-red-deep" label="Source rhythm" />
                <LegendDot color="bg-peach" label="Crawl pulse" />
                <LegendDot color="bg-brand-red" label="Alert pressure" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Status ring</p>
                    <p className="mt-1 text-xs text-muted-foreground">Module readiness</p>
                  </div>
                  <span className="rounded-full bg-brand-red-soft px-3 py-1 text-xs text-brand-red">Live shell</span>
                </div>
                <div className="mt-5 flex items-center justify-center">
                  <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-[conic-gradient(var(--color-brand-red)_0_38%,var(--color-peach)_38%_68%,var(--color-brand-red-deep)_68%_100%)]">
                    <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
                      <span className="text-3xl font-semibold text-foreground">86%</span>
                      <span className="mt-1 text-xs text-muted-foreground">Ready</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <LegendDot color="bg-brand-red" label="TV" />
                  <LegendDot color="bg-peach" label="Web" />
                  <LegendDot color="bg-brand-red-deep" label="Social" />
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                <h2 className="text-lg font-semibold text-foreground">{copy.externalDependency}</h2>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {dependencies.slice(0, 3).map((dependency) => (
                    <li key={dependency} className="rounded-2xl bg-panel-soft px-4 py-3">
                      {dependency}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <EmptyPanel title={copy.noData} description={copy.noDataDescription} eyebrow={copy.activationRequired} />
            <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Operational scope</h2>
                <span className="rounded-full bg-brand-red-soft px-3 py-1 text-xs font-medium text-brand-red-deep">Module ready</span>
              </div>
              <div className="mt-4 space-y-3">
                {capabilities.slice(0, 4).map((capability) => (
                  <div key={capability} className="rounded-2xl border border-border bg-[linear-gradient(180deg,#ffffff,#f8f9ff)] px-4 py-3 text-sm text-foreground">
                    {capability}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
