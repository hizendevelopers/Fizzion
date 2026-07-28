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
      <section className="rounded-[1.9rem] border border-[#E4E7EC] bg-white/92 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-[#FDD4D1] bg-[#FFF1F0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#B42318]">
                {status}
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Sources connected" note="Connected sources will appear here as ingestion is enabled." tone="soft" />
            <KpiCard label="Approved records" note="Verified records populate automatically after synchronization." tone="deep" />
            <KpiCard label="Signal windows" note="Monitoring coverage becomes visible as source schedules are configured." tone="warning" />
            <KpiCard label="Operational scope" note="Dependencies and readiness stay visible while this area expands." tone="brand" />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <EmptyPanel title={copy.noData} description={copy.noDataDescription} eyebrow={copy.activationRequired} />

            <div className="rounded-[1.6rem] border border-[#E4E7EC] bg-[linear-gradient(180deg,#ffffff,#fbfcfe)] p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-semibold text-foreground">Operational scope</h2>
              <div className="mt-4 space-y-3">
                {capabilities.slice(0, 5).map((capability) => (
                  <div key={capability} className="rounded-2xl border border-[#E4E7EC] bg-white px-4 py-3 text-sm text-foreground">
                    {capability}
                  </div>
                ))}
              </div>

              {dependencies.length > 0 ? (
                <div className="mt-5 border-t border-[#EEF2F6] pt-4">
                  <p className="text-sm font-semibold text-foreground">{copy.externalDependency}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dependencies.slice(0, 4).map((dependency) => (
                      <span key={dependency} className="rounded-full border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-1.5 text-xs text-muted-foreground">
                        {dependency}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
