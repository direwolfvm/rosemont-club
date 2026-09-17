import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import boundary from "../data/rosemont-boundary.json";
import type { Feature, Polygon, MultiPolygon } from "geojson";
export const boundaryVersion = "user-supplied-rosemont-2026-09-17";
export function insideRosemont(lon: number, lat: number) {
  return boundary.features.some((f) =>
    booleanPointInPolygon([lon, lat], f as Feature<Polygon | MultiPolygon>),
  );
}
export async function verifyAddress(address: string) {
  const url = new URL(
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
  );
  url.search = new URLSearchParams({
    address,
    benchmark: "Public_AR_Current",
    format: "json",
  }).toString();
  // Never log the URL, submitted address, provider body, or coordinates. Census receives the address solely to geocode it.
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Geocoder unavailable");
  const data = await response.json();
  const matches = data.result?.addressMatches;
  if (!Array.isArray(matches) || matches.length !== 1)
    return { verifiedResident: false, matched: false };
  const m = matches[0];
  const local =
    m.addressComponents?.state === "VA" &&
    /ALEXANDRIA/i.test(m.addressComponents?.city || "");
  return {
    verifiedResident:
      !!local && insideRosemont(m.coordinates.x, m.coordinates.y),
    matched: true,
  };
}
