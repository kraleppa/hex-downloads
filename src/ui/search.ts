import { searchPackages, type HexSearchResult } from "../api/hex";

export function initSearch(opts: { onPick: (name: string) => void }): void {
  const input = document.getElementById("package-search") as HTMLInputElement;
  const list = document.getElementById("search-results") as HTMLUListElement;
  let activeIndex = -1;
  let currentResults: HexSearchResult[] = [];
  let debounceId: number | undefined;

  function hideList() {
    list.hidden = true;
    activeIndex = -1;
  }

  function render(results: HexSearchResult[]) {
    currentResults = results;
    list.innerHTML = "";
    if (results.length === 0) {
      hideList();
      return;
    }
    for (const r of results) {
      const li = document.createElement("li");
      const dl = r.downloads?.recent ?? r.downloads?.all ?? 0;
      li.innerHTML = `<strong>${escapeHtml(r.name)}</strong><span class="muted">${formatNumber(dl)} ↓</span>`;
      li.dataset.name = r.name;
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        opts.onPick(r.name);
        input.value = "";
        hideList();
      });
      list.appendChild(li);
    }
    list.hidden = false;
  }

  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (debounceId) window.clearTimeout(debounceId);
    if (q.length < 2) {
      hideList();
      return;
    }
    debounceId = window.setTimeout(async () => {
      try {
        const results = await searchPackages(q, 10);
        render(results);
      } catch (err) {
        console.error(err);
        hideList();
      }
    }, 250);
  });

  input.addEventListener("keydown", (e) => {
    if (list.hidden || currentResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % currentResults.length;
      highlight();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + currentResults.length) % currentResults.length;
      highlight();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? currentResults[activeIndex] : currentResults[0];
      if (target) {
        opts.onPick(target.name);
        input.value = "";
        hideList();
      }
    } else if (e.key === "Escape") {
      hideList();
    }
  });

  input.addEventListener("blur", () => {
    setTimeout(hideList, 120);
  });

  function highlight() {
    Array.from(list.children).forEach((el, i) => {
      el.classList.toggle("active", i === activeIndex);
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c]!;
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}
