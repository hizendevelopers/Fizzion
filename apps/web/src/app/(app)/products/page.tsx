import { BottleShareOfVoiceCard, CategoryBarCard } from "@/components/states/insight-charts";
import { KpiCard } from "@/components/states/kpi-card";
import { getMonitoringDashboardData } from "@/lib/monitoring-dashboard-data";

export default async function ProductsPage() {
  const dashboard = await getMonitoringDashboardData();
  const totalProductTouchpoints = Math.max(
    dashboard.products.reduce((sum, product) => sum + product.touchpoints, 0),
    1,
  );
  const productMix = dashboard.products.map((product) => ({
    label: product.name,
    share: product.touchpoints / totalProductTouchpoints,
    note: `${product.brand} · ${product.category}`,
    valueLabel: `${product.touchpoints} touchpoints`,
    color: product.color,
  }));
  const byBrand = groupByBrand(dashboard.products);
  const hasProducts = dashboard.products.length > 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-white/85 bg-[radial-gradient(circle_at_top_left,rgba(244,0,9,0.14),transparent_26%),linear-gradient(135deg,#fff8f6_0%,#ffffff_48%,#f7fff8_100%)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-brand-red/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-red">
              Product Intelligence Catalog
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Products
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Coca-Cola portfolio aur competitors ke monitored products ko pictures, touchpoints,
              share of voice, aur channel coverage ke saath ek hi workspace mein compare karo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[28rem]">
            <SummaryBadge label="Portfolio products" value={`${dashboard.products.filter((item) => item.brand === "Coca-Cola" || item.brand === "Sprite").length}`} />
            <SummaryBadge label="Competitor products" value={`${dashboard.products.filter((item) => item.brand !== "Coca-Cola" && item.brand !== "Sprite").length}`} />
            <SummaryBadge label="Tracked products" value={`${dashboard.products.length}`} />
            <SummaryBadge label="Touchpoints" value={`${totalProductTouchpoints}`} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Product SKUs" note="Portfolio and competitor catalog" tone="brand" value={String(dashboard.products.length)} />
          <KpiCard label="Cola Products" note="Coke and Pepsi family SKUs" tone="deep" value={String(dashboard.products.filter((item) => item.category === "Cola").length)} />
          <KpiCard label="Lemon-Lime Products" note="Sprite and 7UP watchlist" tone="soft" value={String(dashboard.products.filter((item) => item.category === "Lemon-Lime").length)} />
          <KpiCard label="Orange Products" note="Flavor competitor line-up" tone="warning" value={String(dashboard.products.filter((item) => item.category === "Orange Soda").length)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <BottleShareOfVoiceCard
          title="Product Share Of Voice"
          subtitle="All monitored products segmented inside one bottle"
          brandLabel="Product mix"
          share={dashboard.summary.cokeShareOfVoice}
          segments={productMix}
          supportingLabel="Real product-level touchpoint mix from the current monitoring catalog"
        />
        <CategoryBarCard
          title="Products by Brand"
          subtitle="How many monitored touchpoints each brand family currently owns"
          data={byBrand}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ProductGroupSection
          title="Coca-Cola Portfolio"
          subtitle="Owned product line-up with monitoring pictures and competitive context"
          products={dashboard.products.filter((item) => item.brand === "Coca-Cola" || item.brand === "Sprite")}
        />
        <ProductGroupSection
          title="Competitor Products"
          subtitle="Pepsi, 7UP, and Mirinda monitored SKUs"
          products={dashboard.products.filter((item) => item.brand !== "Coca-Cola" && item.brand !== "Sprite")}
        />
      </section>

      {!hasProducts ? (
        <section className="rounded-[1.8rem] border border-dashed border-border bg-white px-5 py-8 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
          No real product records are available yet.
        </section>
      ) : null}
    </div>
  );
}

function ProductGroupSection({
  title,
  subtitle,
  products,
}: {
  title: string;
  subtitle: string;
  products: Awaited<ReturnType<typeof getMonitoringDashboardData>>["products"];
}) {
  return (
    <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

      <div className="mt-5 grid gap-4">
        {products.length > 0 ? products.map((product) => (
          <article
            className="grid gap-4 rounded-[1.7rem] border border-border bg-[linear-gradient(135deg,#ffffff_0%,#fbf7f4_100%)] p-5 lg:grid-cols-[200px_1fr]"
            key={product.id}
          >
            <div className="rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,#fffaf8_0%,#fff1ec_100%)] p-4">
              <ProductVisual product={product} />
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
                      style={{ background: product.color }}
                    >
                      {product.brand}
                    </span>
                    <span className="rounded-full border border-border bg-panel-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {product.category}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-foreground">{product.name}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{product.notes}</p>
                </div>
                <div className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Volume</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{product.volumeLabel}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile label="Touchpoints" value={String(product.touchpoints)} />
                <MetricTile label="SOV" value={`${Math.round(product.shareOfVoice * 100)}%`} />
                <MetricTile label="Channels" value={String(product.channels.length)} />
              </div>

              <div className="flex flex-wrap gap-2">
                {product.channels.map((channel) => (
                  <span className="rounded-full border border-border bg-white px-3 py-2 text-sm font-medium text-foreground" key={`${product.id}-${channel}`}>
                    {channel}
                  </span>
                ))}
              </div>
            </div>
          </article>
        )) : (
          <div className="rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-4 py-6 text-sm text-muted-foreground">
            No products available in this section yet.
          </div>
        )}
      </div>
    </section>
  );
}

function ProductVisual({
  product,
}: {
  product: Awaited<ReturnType<typeof getMonitoringDashboardData>>["products"][number];
}) {
  return (
    <div className="flex h-[220px] items-center justify-center overflow-hidden rounded-[1.2rem] bg-white/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <img
        alt={`${product.name} logo`}
        className="h-full w-full object-contain"
        src={product.imageUrl}
      />
    </div>
  );
}

function groupByBrand(products: Awaited<ReturnType<typeof getMonitoringDashboardData>>["products"]) {
  const map = new Map<string, { value: number; color: string }>();
  for (const product of products) {
    const current = map.get(product.brand);
    map.set(product.brand, {
      value: (current?.value ?? 0) + product.touchpoints,
      color: product.color,
    });
  }

  return [...map.entries()].map(([label, entry]) => ({
    label,
    value: entry.value,
    color: entry.color,
    note: `${products.filter((item) => item.brand === label).length} products`,
  }));
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-border bg-white/80 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
