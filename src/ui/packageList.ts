import { state } from "../state";

export function renderPackageChips(opts: { onRemove: (name: string) => void; onFocus: (name: string) => void }): void {
  const host = document.getElementById("package-chips")!;
  host.innerHTML = "";
  if (state.order.length === 0) {
    const empty = document.createElement("span");
    empty.className = "muted";
    empty.textContent = "Search and add a package above to begin.";
    host.appendChild(empty);
    return;
  }
  for (const name of state.order) {
    const pkg = state.packages.get(name);
    if (!pkg) continue;
    const chip = document.createElement("span");
    chip.className = "chip";
    if (state.focus === name) chip.classList.add("focused");
    chip.style.setProperty("--chip-color", pkg.color);
    chip.innerHTML = `
      <span class="chip-dot"></span>
      <span class="chip-label">${pkg.name}</span>
      ${pkg.loading ? '<span class="chip-spinner">…</span>' : ""}
      <button class="chip-remove" title="Remove">×</button>
    `;
    chip.querySelector(".chip-label")!.addEventListener("click", () => opts.onFocus(name));
    chip.querySelector(".chip-remove")!.addEventListener("click", (e) => {
      e.stopPropagation();
      opts.onRemove(name);
    });
    host.appendChild(chip);
  }
}

export function renderAggregatePanel(): void {
  const host = document.getElementById("aggregate-panel")!;
  host.innerHTML = "";
  if (state.order.length === 0) return;

  for (const name of state.order) {
    const pkg = state.packages.get(name);
    if (!pkg) continue;
    const card = document.createElement("div");
    card.className = "agg-card";
    card.style.setProperty("--accent", pkg.color);
    const dl = pkg.meta.downloads;
    card.innerHTML = `
      <header>
        <span class="agg-dot"></span>
        <h3>${pkg.name}</h3>
        <span class="muted">${pkg.meta.latest_stable_version ?? pkg.meta.latest_version}</span>
      </header>
      <p class="agg-desc">${pkg.meta.meta?.description ?? ""}</p>
      <ul class="agg-stats">
        <li><span>All time</span><strong>${formatNumber(dl.all)}</strong></li>
        <li><span>Last 90 days</span><strong>${formatNumber(dl.recent)}</strong></li>
        <li><span>This week</span><strong>${formatNumber(dl.week)}</strong></li>
        <li><span>Yesterday</span><strong>${formatNumber(dl.day)}</strong></li>
        <li><span>Releases</span><strong>${pkg.meta.releases.length}</strong></li>
      </ul>
    `;
    host.appendChild(card);
  }
}

export function renderReleasePanels(opts: { onToggle: (pkg: string, version: string) => void; onSelectAll: (pkg: string, all: boolean) => void }): void {
  const host = document.getElementById("release-panels")!;
  host.innerHTML = "";
  if (state.order.length === 0) return;

  const title = document.createElement("h2");
  title.className = "panel-title";
  title.textContent = "Releases";
  host.appendChild(title);

  for (const name of state.order) {
    const pkg = state.packages.get(name);
    if (!pkg) continue;
    const block = document.createElement("details");
    block.className = "release-block";
    block.open = state.focus === name;
    const selected = pkg.selectedVersions.size;
    const total = pkg.meta.releases.length;
    block.innerHTML = `
      <summary>
        <span class="release-dot" style="background:${pkg.color}"></span>
        <strong>${pkg.name}</strong>
        <span class="muted">${selected}/${total} selected</span>
      </summary>
      <div class="release-actions">
        <button data-action="all">Select all</button>
        <button data-action="none">Clear</button>
      </div>
      <ul class="release-list"></ul>
    `;
    const list = block.querySelector(".release-list")!;
    for (const rel of pkg.meta.releases) {
      const li = document.createElement("li");
      const checked = pkg.selectedVersions.has(rel.version) ? "checked" : "";
      li.innerHTML = `
        <label>
          <input type="checkbox" data-version="${rel.version}" ${checked} />
          <span class="ver">${rel.version}</span>
          <span class="muted">${rel.inserted_at.slice(0, 10)}</span>
        </label>
      `;
      li.querySelector("input")!.addEventListener("change", () => opts.onToggle(name, rel.version));
      list.appendChild(li);
    }
    block.querySelector('[data-action="all"]')!.addEventListener("click", (e) => {
      e.preventDefault();
      opts.onSelectAll(name, true);
    });
    block.querySelector('[data-action="none"]')!.addEventListener("click", (e) => {
      e.preventDefault();
      opts.onSelectAll(name, false);
    });
    host.appendChild(block);
  }
}

function formatNumber(n: number | undefined): string {
  return (n ?? 0).toLocaleString();
}
