import * as echarts from "echarts";
import { state } from "../state";
import { sumReleaseSeries, singleReleaseSeries, movingAverage, trimRange, type DateSeries } from "../data/aggregate";

let mainChart: echarts.ECharts | null = null;
let versionChart: echarts.ECharts | null = null;

export function initCharts(): void {
  const mainEl = document.getElementById("main-chart")!;
  const verEl = document.getElementById("version-chart")!;
  mainChart = echarts.init(mainEl, getTheme());
  versionChart = echarts.init(verEl, getTheme());
  window.addEventListener("resize", () => {
    mainChart?.resize();
    versionChart?.resize();
  });
  document.addEventListener("hex-stats:theme", () => {
    mainChart?.dispose();
    versionChart?.dispose();
    mainChart = echarts.init(mainEl, getTheme());
    versionChart = echarts.init(verEl, getTheme());
    renderCharts();
  });
}

function getTheme(): string {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "dark") return "dark";
  if (explicit === "light") return "";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "";
}

export function renderCharts(): void {
  if (!mainChart) return;
  const c = state.controls;
  const series: echarts.SeriesOption[] = [];
  const legend: string[] = [];

  for (const name of state.order) {
    const pkg = state.packages.get(name);
    if (!pkg) continue;

    if (c.showTotals) {
      const selectedReleases = Array.from(pkg.selectedVersions)
        .map((v) => pkg.releases.get(v))
        .filter((x): x is NonNullable<typeof x> => Boolean(x));
      if (selectedReleases.length > 0) {
        let s = sumReleaseSeries(selectedReleases);
        s = trimRange(s, c.range);
        s = movingAverage(s, c.smoothing);
        const sname = `${pkg.name} (total)`;
        legend.push(sname);
        series.push(buildSeries(sname, s, pkg.color, c.chartType, c.stacking, "pkg-" + pkg.name));
      }
    }

    if (c.showReleases) {
      const versions = Array.from(pkg.selectedVersions);
      versions.sort();
      const shades = makeShades(pkg.color, versions.length);
      versions.forEach((v, i) => {
        const rel = pkg.releases.get(v);
        if (!rel) return;
        let s = singleReleaseSeries(rel);
        s = trimRange(s, c.range);
        s = movingAverage(s, c.smoothing);
        const sname = `${pkg.name}@${v}`;
        legend.push(sname);
        series.push(buildSeries(sname, s, shades[i]!, c.chartType, c.stacking, "rel-" + pkg.name));
      });
    }
  }

  const option: echarts.EChartsCoreOption = {
    animation: false,
    legend: {
      data: legend,
      type: "scroll",
      bottom: 30,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      valueFormatter: (v: unknown) =>
        typeof v === "number" ? Math.round(v).toLocaleString() : String(v ?? ""),
    },
    grid: { left: 56, right: 24, top: 24, bottom: 92, containLabel: true },
    xAxis: { type: "category", data: collectDates(series), boundaryGap: c.chartType === "bar" },
    yAxis: {
      type: c.scale === "log" ? "log" : "value",
      logBase: 10,
      axisLabel: {
        formatter: (v: number) => formatShort(v),
      },
    },
    dataZoom: [
      { type: "inside" },
      { type: "slider", height: 24, bottom: 60 },
    ],
    toolbox: {
      right: 16,
      feature: {
        saveAsImage: { name: "hex-stats", pixelRatio: 2 },
        dataView: { readOnly: true },
        restore: {},
      },
    },
    series,
  };

  mainChart.setOption(option, { notMerge: true });

  renderVersionChart();
}

function buildSeries(
  name: string,
  data: DateSeries,
  color: string,
  chartType: "line" | "bar" | "area",
  stacking: "off" | "release" | "package",
  stackKey: string,
): echarts.SeriesOption {
  const baseStack = stacking === "off" ? undefined : stacking === "package" ? stackKey.replace("rel-", "pkg-") : stackKey;
  if (chartType === "bar") {
    return {
      name,
      type: "bar",
      stack: baseStack,
      data: data.dates.map((d, i) => [d, data.values[i]]),
      itemStyle: { color },
      emphasis: { focus: "series" },
    };
  }
  return {
    name,
    type: "line",
    stack: baseStack,
    showSymbol: false,
    smooth: false,
    data: data.dates.map((d, i) => [d, data.values[i]]),
    lineStyle: { color, width: 2 },
    itemStyle: { color },
    areaStyle: chartType === "area" ? { color, opacity: 0.25 } : undefined,
    emphasis: { focus: "series" },
  };
}

function collectDates(series: echarts.SeriesOption[]): string[] {
  const all = new Set<string>();
  for (const s of series) {
    const data = (s as { data?: unknown[] }).data;
    if (!Array.isArray(data)) continue;
    for (const point of data) {
      if (Array.isArray(point) && typeof point[0] === "string") all.add(point[0]);
    }
  }
  return Array.from(all).sort();
}

function renderVersionChart(): void {
  if (!versionChart) return;
  const label = document.getElementById("focus-pkg-label")!;
  const name = state.focus ?? state.order[0];
  if (!name) {
    versionChart.clear();
    label.textContent = "";
    return;
  }
  const pkg = state.packages.get(name);
  if (!pkg) return;
  label.textContent = `— ${pkg.name}`;

  const releases = pkg.meta.releases.map((r) => {
    const detail = pkg.releases.get(r.version);
    const lifetime = detail
      ? detail.downloads.reduce((acc, [, n]) => acc + n, 0)
      : null;
    return { version: r.version, lifetime };
  });
  const known = releases.filter((r): r is { version: string; lifetime: number } => r.lifetime !== null);
  known.sort((a, b) => b.lifetime - a.lifetime);
  const ordered = known.slice().reverse();

  const visibleRows = 25;
  const endPct = ordered.length > visibleRows ? Math.max(0, ((ordered.length - visibleRows) / ordered.length) * 100) : 0;

  const option: echarts.EChartsCoreOption = {
    animation: false,
    grid: { left: 110, right: 60, top: 16, bottom: 32 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "value", axisLabel: { formatter: (v: number) => formatShort(v) } },
    yAxis: {
      type: "category",
      data: ordered.map((r) => r.version),
      axisLabel: {
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: 11,
        interval: 0,
      },
    },
    dataZoom:
      ordered.length > visibleRows
        ? [
            { type: "inside", yAxisIndex: 0, start: endPct, end: 100, zoomLock: false },
            { type: "slider", yAxisIndex: 0, start: endPct, end: 100, width: 14, right: 16 },
          ]
        : [],
    series: [
      {
        type: "bar",
        data: ordered.map((r) => r.lifetime),
        itemStyle: { color: pkg.color },
      },
    ],
  };
  versionChart.setOption(option, { notMerge: true });
}

function makeShades(base: string, count: number): string[] {
  if (count <= 1) return [base];
  const { h, s } = rgbToHsl(parseHex(base));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const lightness = 0.25 + t * 0.55;
    const sat = Math.min(1, s + (t < 0.5 ? 0.05 : -0.05));
    out.push(hslToCss(h, sat, lightness));
  }
  return out;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case R:
        h = ((G - B) / d + (G < B ? 6 : 0)) * 60;
        break;
      case G:
        h = ((B - R) / d + 2) * 60;
        break;
      default:
        h = ((R - G) / d + 4) * 60;
    }
  }
  return { h, s, l };
}

function hslToCss(h: number, s: number, l: number): string {
  return `hsl(${h.toFixed(1)}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%)`;
}

function formatShort(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return String(v);
}
