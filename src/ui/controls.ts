import { state, emit, type ChartType, type Stacking, type DateRange } from "../state";
import type { Granularity } from "../api/hex";

export function initControls(opts: { onChange: () => void; onGranularityChange: () => void }): void {
  const g = byId<HTMLSelectElement>("ctrl-granularity");
  const ct = byId<HTMLSelectElement>("ctrl-chart-type");
  const sc = byId<HTMLSelectElement>("ctrl-scale");
  const sm = byId<HTMLSelectElement>("ctrl-smoothing");
  const st = byId<HTMLSelectElement>("ctrl-stack");
  const tot = byId<HTMLInputElement>("ctrl-show-totals");
  const rel = byId<HTMLInputElement>("ctrl-show-releases");
  const rg = byId<HTMLSelectElement>("ctrl-range");

  g.addEventListener("change", () => {
    state.controls.granularity = g.value as Granularity;
    opts.onGranularityChange();
  });
  ct.addEventListener("change", () => {
    state.controls.chartType = ct.value as ChartType;
    opts.onChange();
  });
  sc.addEventListener("change", () => {
    state.controls.scale = sc.value as "linear" | "log";
    opts.onChange();
  });
  sm.addEventListener("change", () => {
    state.controls.smoothing = Number(sm.value);
    opts.onChange();
  });
  st.addEventListener("change", () => {
    state.controls.stacking = st.value as Stacking;
    opts.onChange();
  });
  tot.addEventListener("change", () => {
    state.controls.showTotals = tot.checked;
    opts.onChange();
  });
  rel.addEventListener("change", () => {
    state.controls.showReleases = rel.checked;
    opts.onChange();
  });
  rg.addEventListener("change", () => {
    state.controls.range = rg.value === "all" ? "all" : (Number(rg.value) as DateRange);
    opts.onChange();
  });

  emit();
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}
