"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import boundary from "@/data/rosemont-boundary.json";
import type { Map as LeafletMap, LayerGroup, LatLngExpression } from "leaflet";

export type LonLat = [number, number];

/**
 * Click-to-draw polygon editor used for a group's custom eligibility area.
 * Points are stored as [longitude, latitude] pairs, the same order as GeoJSON
 * and the Club boundary file. Leaflet is loaded in the browser only.
 */
export default function PolygonMap({
  points,
  onChange,
}: {
  points: LonLat[];
  onChange: (points: LonLat[]) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const latest = useRef({ points, onChange });
  latest.current = { points, onChange };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !container.current || map.current) return;
      const m = L.map(container.current, {
        center: [38.8135, -77.0645],
        zoom: 15,
        scrollWheelZoom: false,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(m);
      L.geoJSON(boundary as never, {
        style: { color: "#1f4a76", weight: 1.5, dashArray: "6 4", fill: false },
        interactive: false,
      }).addTo(m);
      m.on("click", (event) => {
        latest.current.onChange([
          ...latest.current.points,
          [
            Number(event.latlng.lng.toFixed(6)),
            Number(event.latlng.lat.toFixed(6)),
          ],
        ]);
      });
      map.current = m;
      draw(L, m);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw(L: typeof import("leaflet"), m: LeafletMap) {
    layer.current?.remove();
    const group = L.layerGroup();
    const current = latest.current.points;
    current.forEach((p) =>
      L.circleMarker([p[1], p[0]], {
        radius: 5,
        color: "#c2571f",
        fillColor: "#fdeee3",
        fillOpacity: 1,
        weight: 2,
      }).addTo(group),
    );
    if (current.length >= 2)
      L.polygon(
        current.map((p): LatLngExpression => [p[1], p[0]]),
        { color: "#c2571f", weight: 2, fillOpacity: 0.18 },
      ).addTo(group);
    group.addTo(m);
    layer.current = group;
  }

  useEffect(() => {
    if (!map.current) return;
    import("leaflet").then(({ default: L }) => {
      if (map.current) draw(L, map.current);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  return (
    <div className="polygon-editor">
      <div
        ref={container}
        className="polygon-map"
        role="application"
        aria-label="Map for drawing the group's eligible area. Click to add points."
      />
      <div className="actions">
        <button
          type="button"
          className="secondary"
          disabled={!points.length}
          onClick={() => onChange(points.slice(0, -1))}
        >
          Undo last point
        </button>
        <button
          type="button"
          className="text-button"
          disabled={!points.length}
          onClick={() => onChange([])}
        >
          Clear area
        </button>
        <small>
          {points.length} point{points.length === 1 ? "" : "s"}. Click the map to
          add a corner; three or more make an area. The dashed line is the Club
          boundary.
        </small>
      </div>
    </div>
  );
}
