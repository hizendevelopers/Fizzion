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
      center: [55.5, 29.2],
      zoom: 4.2,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        trackUserLocation: false,
        positionOptions: { enableHighAccuracy: true },
      }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource("ooh-assets", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterRadius: 44,
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
            "#ef4444",
            [">", ["get", "digitalCount"], ["get", "billboardCount"]],
            "#2563eb",
            "#6b7280",
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 40, 32],
          "circle-opacity": 0.92,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
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
            "#ef4444",
            "DIGITAL_SCREEN",
            "#2563eb",
            "#6b7280",
          ],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "ooh-points-highlight",
        type: "circle",
        source: "ooh-assets",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isHighlighted"], 1]],
        paint: {
          "circle-radius": 14,
          "circle-color": "rgba(255,255,255,0.1)",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#f59e0b",
        },
      });

      map.on("click", "ooh-clusters", (event) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        const source = map.getSource("ooh-assets") as GeoJSONSource | undefined;
        if (!source || clusterId === undefined || clusterId === null) return;
        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const coordinates = ((feature?.geometry as unknown as { coordinates?: [number, number] } | undefined)?.coordinates);
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
        })
          .setLngLat(coordinates)
          .setHTML(`
            <div class="w-[220px] bg-white">
              ${properties.primaryImageUrl ? `<img src="${properties.primaryImageUrl}" alt="${properties.assetCode}" style="width:100%;height:112px;object-fit:cover;" />` : ""}
              <div style="padding:12px 14px;">
                <div style="font-weight:600;color:#111111;">${properties.assetCode}</div>
                <div style="font-size:12px;color:#786c68;margin-top:2px;">${properties.locationName}</div>
                <div style="font-size:12px;color:#786c68;margin-top:6px;">${properties.areaName ?? "Area unavailable"} · ${properties.mediaType === "DIGITAL_SCREEN" ? "Digital Screen" : "Billboard"}</div>
                <div style="font-size:12px;color:#111111;margin-top:8px;">${properties.brandName ?? "No brand assigned"}</div>
                <div style="font-size:12px;color:#111111;margin-top:4px;">Daily cost: ${properties.dailyCost ? `${properties.dailyCost} ${properties.currency ?? ""}` : "Not available"}</div>
                <div style="font-size:12px;color:#111111;margin-top:4px;">Audience: ${formatCompactValue(Number(properties.expectedDailyAudience ?? 0))}</div>
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
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Inventory map</p>
          <p className="text-xs text-muted-foreground">Clustered GeoJSON markers with live filter synchronization</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
            Billboard
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
            Digital Screen
          </span>
        </div>
      </div>
      <div ref={containerRef} className="h-[460px] w-full bg-[#f3efe9]" />
    </div>
  );
}
