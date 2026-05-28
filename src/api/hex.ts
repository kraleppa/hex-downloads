import { cacheGet, cacheSet } from "./cache";

export const HEX_API_BASE = "https://hex.pm/api";

export type Granularity = "day" | "month";

export interface HexSearchResult {
  name: string;
  downloads?: { all?: number; recent?: number };
  meta?: { description?: string };
}

export interface HexRelease {
  version: string;
  url: string;
  inserted_at: string;
  has_docs?: boolean;
}

export interface HexPackage {
  name: string;
  html_url: string;
  meta?: { description?: string; licenses?: string[] };
  downloads: { all?: number; recent?: number; week?: number; day?: number };
  releases: HexRelease[];
  latest_version: string;
  latest_stable_version?: string;
  inserted_at: string;
  updated_at: string;
}

export interface HexReleaseDetail {
  version: string;
  inserted_at: string;
  downloads: Array<[string, number]>;
}

async function fetchJson<T>(url: string, ttlMs: number | null): Promise<T> {
  const cached = cacheGet<T>(url);
  if (cached !== null) return cached;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`HEX API ${res.status} for ${url}`);
  }
  const data = (await res.json()) as T;
  cacheSet(url, data, ttlMs);
  return data;
}

const FIVE_MIN = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export function searchPackages(query: string, limit = 10): Promise<HexSearchResult[]> {
  const url = `${HEX_API_BASE}/packages?search=${encodeURIComponent(query)}&sort=recent_downloads&page=1`;
  return fetchJson<HexSearchResult[]>(url, FIVE_MIN).then((list) => list.slice(0, limit));
}

export function getPackage(name: string): Promise<HexPackage> {
  const url = `${HEX_API_BASE}/packages/${encodeURIComponent(name)}`;
  return fetchJson<HexPackage>(url, ONE_HOUR);
}

export function getReleaseDownloads(
  packageName: string,
  version: string,
  granularity: Granularity,
  isLatest: boolean,
): Promise<HexReleaseDetail> {
  const url = `${HEX_API_BASE}/packages/${encodeURIComponent(packageName)}/releases/${encodeURIComponent(version)}?downloads=${granularity}`;
  const ttl = isLatest ? ONE_HOUR : ONE_DAY * 30;
  return fetchJson<HexReleaseDetail>(url, ttl);
}
