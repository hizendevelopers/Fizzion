"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike, type Map } from "maplibre-gl";

import type { OohAssetListItem } from "@/lib/ooh/ooh-data";

const DEFAULT_MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://demotiles.maplibre.org/style.json";

type OohMapProps = {
  assets: OohAssetListItem[];
  highlightedAssetId?: string | null;
  onSelectAsset?: (assetId: string) => void;
};

function getFeatureCollection(assets: OohAssetListItem[], highlightedAssetId?: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: assets
      .filter((asset) => asset.latitude !== null && asset.longitude !== null)
      .map((asset) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [asset.longitude as number, asset.latitude as number],
        },
        properties: {
          assetId: asset.id,
          assetCode: asset.assetCode,
          areaName: asset.areaName,
          locationName: asset.locationName,
          mediaType: asset.mediaType,
          assetTypeLabel: asset.assetTypeLabel,
          region: asset.region,
          brandName: asset.brandName,
          dailyCost: asset.dailyCost,
          currency: asset.currency,
          expectedDailyAudience: asset.expectedDailyAudience,
          primaryImageUrl: asset.primaryImageUrl,
          isHighlighted: highlightedAssetId === asset.id ? 1 : 0,
        },
      })),
  };
}

function formatCompactValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not available";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function OohMap({ assets, highlightedAssetId, onSelectAsset }: OohMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const geojson = useMemo(() => getFeatureCollection(assets, highlightedAssetId), [assets, highlightedAssetId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_MAP_STYLE,
      center: [44.3661, 33.3152],
      zoom: 5.2,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        trackUserLocation: false,
        positionOptions: { enableHighAccuracy: true },
      }),
      "top-right",
    );
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    map.on("load", () => {
      map.addSource("ooh-assets", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 11,
        clusterProperties: {
          billboardCount: ["+", ["case", ["==", ["get", "mediaType"], "BILLBOARD"], 1, 0]],
          digitalCount: ["+", ["case", ["==", ["get", "mediaType"], "DIGITAL_SCREEN"], 1, 0]],
        },
      } as never);

      map.addLayer({
        id: "ooh-clusters",
        type: "circle",
        source: "ooh-assets",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "case",
            [">", ["get", "billboardCount"], ["get", "digitalCount"]],
            "#F40009",
            [">", ["get", "digitalCount"], ["get", "billboardCount"]],
            "#2563eb",
            "#6b7280",
          ],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 26, 40, 34],
          "circle-opacity": 0.9,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
          "circle-blur": 0.12,
        },
      });

      map.addLayer({
        id: "ooh-cluster-count",
        type: "symbol",
        source: "ooh-assets",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "ooh-points",
        type: "circle",
        source: "ooh-assets",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "mediaType"],
            "BILLBOARD",
            "#F40009",
            "DIGITAL_SCREEN",
            "#2563eb",
            "#6b7280",
          ],
          "circle-radius": 9,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "ooh-points-highlight",
        type: "circle",
        source: "ooh-assets",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isHighlighted"], 1]],
        paint: {
          "circle-radius": 16,
          "circle-color": "rgba(255,255,255,0.15)",
          "circle-stroke-width": 4,
          "circle-stroke-color": "#f59e0b",
        },
      });

      map.on("click", "ooh-clusters", (event) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        const source = map.getSource("ooh-assets") as GeoJSONSource | undefined;
        if (!source || clusterId === undefined || clusterId === null) return;
        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const coordinates = (feature?.geometry as unknown as { coordinates?: [number, number] } | undefined)?.coordinates;
          if (!coordinates) return;
          map.easeTo({ center: coordinates, zoom });
        });
      });

      map.on("click", "ooh-points", (event) => {
        const feature = event.features?.[0];
        const assetId = feature?.properties?.assetId;
        if (assetId && onSelectAsset) onSelectAsset(assetId);
      });

      map.on("mouseenter", "ooh-points", (event) => {
        map.getCanvas().style.cursor = "pointer";
        const feature = event.features?.[0];
        if (!feature) return;
        const coordinates = ((feature.geometry as unknown as { coordinates: [number, number] }).coordinates.slice() as [number, number]);
        const properties = feature.properties ?? {};

        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 18,
          className: "ooh-map-popup",
        })
          .setLngLat(coordinates)
          .setHTML(`
            <div style="width:248px;overflow:hidden;border-radius:20px;background:linear-gradient(180deg,#fff9f7 0%,#ffffff 100%);box-shadow:0 24px 60px rgba(53,24,24,0.18);">
              ${properties.primaryImageUrl ? `<img src="${properties.primaryImageUrl}" alt="${properties.assetCode}" style="width:100%;height:120px;object-fit:cover;" />` : `<div style="display:flex;height:120px;align-items:center;justify-content:center;background:#f7efea;color:#8c7d77;font-size:12px;">No uploaded visual</div>`}
              <div style="padding:14px 15px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                  <div style="font-weight:700;color:#111111;font-size:14px;">${properties.assetCode}</div>
                  <div style="border-radius:999px;background:${properties.mediaType === "DIGITAL_SCREEN" ? "#e7f0ff" : "#fde9e7"};padding:4px 8px;font-size:11px;font-weight:700;color:${properties.mediaType === "DIGITAL_SCREEN" ? "#2563eb" : "#d12f2f"};">${properties.assetTypeLabel ?? (properties.mediaType === "DIGITAL_SCREEN" ? "Digital" : "Billboard")}</div>
                </div>
                <div style="font-size:12px;color:#786c68;margin-top:4px;">${properties.locationName}</div>
                <div style="font-size:12px;color:#786c68;margin-top:8px;">${properties.areaName ?? "Area unavailable"} · ${properties.region ?? "Unknown region"}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
                  <div style="border-radius:14px;background:#fff4f2;padding:8px 10px;">
                    <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#a08e87;">Brand</div>
                    <div style="margin-top:4px;font-size:12px;font-weight:600;color:#111111;">${properties.brandName ?? "Unassigned"}</div>
                  </div>
                  <div style="border-radius:14px;background:#fff4f2;padding:8px 10px;">
                    <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#a08e87;">Spend</div>
                    <div style="margin-top:4px;font-size:12px;font-weight:600;color:#111111;">${properties.dailyCost ? `${Number(properties.dailyCost).toLocaleString()} ${properties.currency ?? ""}` : "Not available"}</div>
                  </div>
                </div>
                <div style="margin-top:10px;font-size:12px;color:#111111;">Audience: ${formatCompactValue(Number(properties.expectedDailyAudience ?? 0))}</div>
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on("mouseleave", "ooh-points", () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });
    });

    mapRef.current = map;
    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [geojson, onSelectAsset]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("ooh-assets") as GeoJSONSource | undefined;
    source?.setData(geojson);

    const bounds = assets
      .filter((asset) => asset.latitude !== null && asset.longitude !== null)
      .reduce<maplibregl.LngLatBounds | null>((accumulator, asset) => {
        const coordinates = [asset.longitude as number, asset.latitude as number] as [number, number];
        if (!accumulator) {
          return new maplibregl.LngLatBounds(coordinates, coordinates);
        }
        return accumulator.extend(coordinates);
      }, null);

    if (bounds && !bounds.isEmpty()) {
      map.fitBounds(bounds.toArray() as LngLatBoundsLike, {
        padding: 48,
        maxZoom: 11.5,
        duration: 700,
      });
    }
  }, [assets, geojson]);

  return (
    <div className="relative overflow-hidden rounded-[1.8rem] border border-border bg-white shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 border-b border-border bg-[linear-gradient(135deg,#fff7f4_0%,#fff 40%,#f7fbff_100%)] px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Inventory map</p>
          <p className="text-xs text-muted-foreground">Interactive OOH coverage map with clustered markers and live directory sync</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F40009]" />
            Billboard
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
            Digital Screen
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
            Selected
          </span>
        </div>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-white/70 to-transparent" />
        <div ref={containerRef} className="h-[500px] w-full bg-[#efe7e1]" />
      </div>
    </div>
  );
}
