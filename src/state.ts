import type { Granularity, HexPackage, HexReleaseDetail } from "./api/hex";

export interface PackageState {
  name: string;
  color: string;
  meta: HexPackage;
  selectedVersions: Set<string>;
  releases: Map<string, HexReleaseDetail>;
  loading: boolean;
}

export type ChartType = "line" | "bar" | "area";
export type Stacking = "off" | "release" | "package";
export type DateRange = 30 | 90 | 365 | "all";

export interface Controls {
  granularity: Granularity;
  chartType: ChartType;
  scale: "linear" | "log";
  smoothing: number;
  stacking: Stacking;
  showTotals: boolean;
  showReleases: boolean;
  range: DateRange;
}

export interface AppState {
  packages: Map<string, PackageState>;
  order: string[];
  focus: string | null;
  controls: Controls;
}

export const COLOR_PALETTE = [
  "#5470c6",
  "#91cc75",
  "#fac858",
  "#ee6666",
  "#73c0de",
  "#3ba272",
  "#fc8452",
  "#9a60b4",
  "#ea7ccc",
  "#f56991",
];

export const state: AppState = {
  packages: new Map(),
  order: [],
  focus: null,
  controls: {
    granularity: "day",
    chartType: "line",
    scale: "linear",
    smoothing: 0,
    stacking: "off",
    showTotals: true,
    showReleases: false,
    range: "all",
  },
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(): void {
  for (const fn of listeners) fn();
}

export function nextColor(): string {
  const used = new Set(Array.from(state.packages.values()).map((p) => p.color));
  for (const c of COLOR_PALETTE) {
    if (!used.has(c)) return c;
  }
  return COLOR_PALETTE[state.packages.size % COLOR_PALETTE.length]!;
}
