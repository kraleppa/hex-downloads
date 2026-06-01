import { getPackage, getReleaseDownloads, type HexReleaseDetail } from "./api/hex";
import { pool } from "./data/concurrency";
import { state, emit, subscribe, nextColor, type PackageState } from "./state";
import { initSearch } from "./ui/search";
import { initControls } from "./ui/controls";
import { initCharts, renderCharts } from "./ui/chart";
import { renderPackageChips, renderAggregatePanel, renderReleasePanels } from "./ui/packageList";

const POOL_LIMIT = 6;

async function addPackage(name: string): Promise<void> {
  if (state.packages.has(name)) {
    state.focus = name;
    emit();
    return;
  }

  const placeholder: PackageState = {
    name,
    color: nextColor(),
    meta: {
      name,
      html_url: "",
      downloads: { all: 0, recent: 0, week: 0, day: 0 },
      releases: [],
      latest_version: "",
      inserted_at: "",
      updated_at: "",
    },
    selectedVersions: new Set(),
    releases: new Map(),
    loading: true,
  };
  state.packages.set(name, placeholder);
  state.order.push(name);
  state.focus = name;
  emit();

  try {
    const meta = await getPackage(name);
    placeholder.meta = meta;
    for (const r of meta.releases) placeholder.selectedVersions.add(r.version);
    emit();
    await loadReleases(name);
  } catch (err) {
    console.error(err);
    alert(`Failed to load package "${name}": ${(err as Error).message}`);
    removePackage(name);
  }
}

function removePackage(name: string): void {
  state.packages.delete(name);
  state.order = state.order.filter((n) => n !== name);
  if (state.focus === name) state.focus = state.order[0] ?? null;
  emit();
}

async function loadReleases(name: string): Promise<void> {
  const pkg = state.packages.get(name);
  if (!pkg) return;
  pkg.loading = true;
  emit();

  const granularity = state.controls.granularity;
  const releases = pkg.meta.releases;
  const latestVersions = new Set(
    [pkg.meta.latest_version, pkg.meta.latest_stable_version].filter(Boolean),
  );

  const progress = document.getElementById("chart-progress")!;
  const fill = document.getElementById("progress-fill") as HTMLDivElement;
  const label = document.getElementById("progress-label") as HTMLSpanElement;
  progress.hidden = false;
  fill.style.width = "0%";
  label.textContent = `Loading ${name} (0/${releases.length})`;

  const results = await pool<{ version: string }, HexReleaseDetail | null>(
    releases,
    POOL_LIMIT,
    async (r) => {
      try {
        return await getReleaseDownloads(name, r.version, granularity, latestVersions.has(r.version));
      } catch (err) {
        console.warn(`failed ${name}@${r.version}`, err);
        return null;
      }
    },
    (done, total) => {
      fill.style.width = `${Math.round((done / total) * 100)}%`;
      label.textContent = `Loading ${name} (${done}/${total})`;
    },
  );

  pkg.releases.clear();
  results.forEach((rel, idx) => {
    if (rel) pkg.releases.set(releases[idx]!.version, rel);
  });
  pkg.loading = false;
  progress.hidden = true;
  emit();
}

function toggleVersion(pkgName: string, version: string): void {
  const pkg = state.packages.get(pkgName);
  if (!pkg) return;
  if (pkg.selectedVersions.has(version)) pkg.selectedVersions.delete(version);
  else pkg.selectedVersions.add(version);
  emit();
}

function setAllVersions(pkgName: string, all: boolean): void {
  const pkg = state.packages.get(pkgName);
  if (!pkg) return;
  pkg.selectedVersions.clear();
  if (all) {
    for (const r of pkg.meta.releases) pkg.selectedVersions.add(r.version);
  }
  emit();
}

function focusPackage(name: string): void {
  state.focus = name;
  emit();
}

function applyTheme(theme: "light" | "dark" | "system"): void {
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
  localStorage.setItem("hex-stats:theme", theme);
  document.dispatchEvent(new Event("hex-stats:theme"));
}

function initTheme(): void {
  const stored = (localStorage.getItem("hex-stats:theme") as "light" | "dark" | "system" | null) ?? "system";
  applyTheme(stored);
  const btn = document.getElementById("theme-toggle")!;
  btn.addEventListener("click", () => {
    const cur = (localStorage.getItem("hex-stats:theme") as "light" | "dark" | "system" | null) ?? "system";
    const order: Array<"system" | "light" | "dark"> = ["system", "light", "dark"];
    const next = order[(order.indexOf(cur) + 1) % order.length]!;
    applyTheme(next);
  });
}

function rerender(): void {
  renderPackageChips({ onRemove: removePackage, onFocus: focusPackage });
  renderAggregatePanel();
  renderReleasePanels({ onToggle: toggleVersion, onSelectAll: setAllVersions });
  renderCharts();
}

async function refetchAllReleases(): Promise<void> {
  for (const name of state.order) {
    await loadReleases(name);
  }
}

function boot(): void {
  initTheme();
  initCharts();
  initSearch({ onPick: addPackage });
  initControls({
    onChange: () => emit(),
    onGranularityChange: () => {
      void refetchAllReleases();
    },
  });
  subscribe(rerender);
  rerender();
}

boot();
