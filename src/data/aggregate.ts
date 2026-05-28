import type { HexReleaseDetail, Granularity } from "../api/hex";

export interface DateSeries {
  dates: string[];
  values: number[];
}

export function sumReleaseSeries(releases: HexReleaseDetail[]): DateSeries {
  const totals = new Map<string, number>();
  for (const rel of releases) {
    for (const [date, count] of rel.downloads ?? []) {
      totals.set(date, (totals.get(date) ?? 0) + count);
    }
  }
  return mapToSeries(totals);
}

export function singleReleaseSeries(release: HexReleaseDetail): DateSeries {
  const totals = new Map<string, number>(release.downloads ?? []);
  return mapToSeries(totals);
}

function mapToSeries(totals: Map<string, number>): DateSeries {
  const dates = Array.from(totals.keys()).sort();
  if (dates.length === 0) return { dates: [], values: [] };
  const filled = fillGaps(dates);
  const values = filled.map((d) => totals.get(d) ?? 0);
  return { dates: filled, values };
}

function fillGaps(sortedDates: string[]): string[] {
  if (sortedDates.length === 0) return [];
  const first = sortedDates[0]!;
  const last = sortedDates[sortedDates.length - 1]!;
  const granularity: Granularity = first.length === 7 ? "month" : "day";

  const out: string[] = [];
  let cursor = first;
  while (cursor <= last) {
    out.push(cursor);
    cursor = next(cursor, granularity);
  }
  return out;
}

function next(date: string, granularity: Granularity): string {
  if (granularity === "month") {
    const [y, m] = date.split("-").map(Number) as [number, number];
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    return `${ny}-${String(nm).padStart(2, "0")}`;
  }
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function movingAverage(series: DateSeries, window: number): DateSeries {
  if (window <= 1) return series;
  const values: number[] = [];
  for (let i = 0; i < series.values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.values.slice(start, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    values.push(sum / slice.length);
  }
  return { dates: series.dates, values };
}

export function trimRange(series: DateSeries, days: number | "all"): DateSeries {
  if (days === "all" || series.dates.length === 0) return series;
  const cutoffIdx = Math.max(0, series.dates.length - days);
  return {
    dates: series.dates.slice(cutoffIdx),
    values: series.values.slice(cutoffIdx),
  };
}
