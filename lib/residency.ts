import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import boundary from "../data/rosemont-boundary.json";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import type { Eligibility } from "./schema";
export const boundaryVersion = "user-supplied-rosemont-2026-09-17";
export function insideRosemont(lon: number, lat: number) {
  return boundary.features.some((f) =>
    booleanPointInPolygon([lon, lat], f as Feature<Polygon | MultiPolygon>),
  );
}
/**
 * What the geocoder told us about one address. It lives in memory for the
 * duration of a single request and is never persisted or logged.
 */
export type AddressMatch = {
  lon: number;
  lat: number;
  local: boolean;
  /** Normalized street, e.g. "W OAK ST". */
  street: string;
  /** Normalized first address line, e.g. "12 W OAK ST". */
  line1: string;
};
const suffixes: Record<string, string> = {
  STREET: "ST",
  AVENUE: "AVE",
  ROAD: "RD",
  DRIVE: "DR",
  LANE: "LN",
  COURT: "CT",
  PLACE: "PL",
  TERRACE: "TER",
  BOULEVARD: "BLVD",
  CIRCLE: "CIR",
  PARKWAY: "PKWY",
  HIGHWAY: "HWY",
  WAY: "WAY",
  NORTH: "N",
  SOUTH: "S",
  EAST: "E",
  WEST: "W",
};
/** Uppercase, drop punctuation, and use postal abbreviations so owner input matches the geocoder. */
export function normalizeStreet(value: string) {
  return value
    .toUpperCase()
    .replace(/[.,#]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => suffixes[w] || w)
    .join(" ");
}
export function normalizeAddressLine(value: string) {
  return normalizeStreet(value.split(",")[0]);
}
export async function geocodeAddress(
  address: string,
): Promise<AddressMatch | null> {
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
  if (!Array.isArray(matches) || matches.length !== 1) return null;
  const m = matches[0];
  const c = m.addressComponents || {};
  return {
    lon: m.coordinates.x,
    lat: m.coordinates.y,
    local: c.state === "VA" && /ALEXANDRIA/i.test(c.city || ""),
    street: normalizeStreet(
      [c.preDirection, c.preType, c.streetName, c.suffixType, c.suffixDirection]
        .filter(Boolean)
        .join(" "),
    ),
    line1: normalizeAddressLine(String(m.matchedAddress || "")),
  };
}
export function residentFromMatch(match: AddressMatch | null) {
  return !!match && match.local && insideRosemont(match.lon, match.lat);
}
/** Does this address satisfy a group's custom eligibility rule? Pure and side-effect free. */
export function matchesEligibility(
  match: AddressMatch,
  rule: Eligibility | undefined,
) {
  if (!rule || rule.mode !== "custom") return false;
  if (rule.streets.some((s) => normalizeStreet(s) === match.street))
    return true;
  if (rule.addresses.some((a) => normalizeAddressLine(a) === match.line1))
    return true;
  if (rule.polygon.length >= 3) {
    const ring = [...rule.polygon, rule.polygon[0]];
    const feature: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [ring] },
    };
    if (booleanPointInPolygon([match.lon, match.lat], feature)) return true;
  }
  return false;
}
export function eligibleGroupIds(
  match: AddressMatch | null,
  groups: { id: string; eligibility?: Eligibility }[],
) {
  if (!match) return [];
  return groups
    .filter((g) => matchesEligibility(match, g.eligibility))
    .map((g) => g.id);
}
/** Flags only. Callers that need the match (never persisted) use geocodeAddress directly. */
export async function verifyAddress(address: string) {
  const match = await geocodeAddress(address);
  return { verifiedResident: residentFromMatch(match), matched: !!match };
}
