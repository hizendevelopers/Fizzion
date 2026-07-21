"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map } from "maplibre-gl";

const DEFAULT_MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://demotiles.maplibre.org/style.json";

type OohCoordinatePickerProps = {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
};

export function OohCoordinatePicker({ latitude, longitude, onChange }: OohCoordinatePickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_MAP_STYLE,
      center: longitude !== null && latitude !== null ? [longitude, latitude] : [55.5, 29.2],
      zoom: longitude !== null && latitude !== null ? 10.5 : 4.2,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("click", (event) => {
      onChange(Number(event.lngLat.lat.toFixed(7)), Number(event.lngLat.lng.toFixed(7)));
    });

    mapRef.current = map;
    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, onChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || latitude === null || longitude === null) return;

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: "#f40009", draggable: true })
        .setLngLat([longitude, latitude])
        .addTo(map);
      markerRef.current.on("dragend", () => {
        const lngLat = markerRef.current?.getLngLat();
        if (!lngLat) return;
        onChange(Number(lngLat.lat.toFixed(7)), Number(lngLat.lng.toFixed(7)));
      });
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }

    map.easeTo({
      center: [longitude, latitude],
      zoom: Math.max(map.getZoom(), 10.5),
      duration: 500,
    });
  }, [latitude, longitude, onChange]);

  return <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-[1.5rem] border border-border bg-panel-soft" />;
}
