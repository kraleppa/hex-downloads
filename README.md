# hex-stats

Single-page dashboard for HEX.pm Elixir package download statistics.
Charts powered by [Apache ECharts](https://echarts.apache.org/), built with Vite + TypeScript, deployed to GitHub Pages.

## Features

- Search any Elixir package on hex.pm and compare multiple packages on one chart
- Two simultaneous series modes:
  - **Package totals** — daily/monthly downloads summed across all selected releases
  - **Per-release** — individual release time series; both can be shown together
- Pick which versions to include per package (toggle individual releases on/off)
- Daily or monthly granularity (data fetched on demand from `?downloads=day|month`)
- Linear / log Y-axis, 7- or 30-period moving average, stacking by release or by package, line/bar/area
- DataZoom slider, presets for last 30 / 90 / 365 days, PNG + CSV export via ECharts toolbox
- Aggregate stat cards (all-time, last 90 d, last week, yesterday) per package
- Bar chart of lifetime downloads per version (top 25)
- `localStorage` cache of release responses — older releases cached effectively forever (immutable), latest release refetched hourly
- Light / dark / system theme

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and start searching.

## Build

```bash
npm run build      # type-check + emit dist/
npm run preview    # serve dist/ locally
```

The Vite `base` path comes from the `BASE_PATH` env var (falls back to `/hex-stats/`).
GitHub Actions sets it to `/$REPO_NAME/` automatically.

## Deployment

`.github/workflows/deploy.yml` deploys to GitHub Pages on every push to `main`. One-time setup:

1. Push the repo to GitHub.
2. Repo Settings → Pages → **Source: GitHub Actions**.
3. Push to `main`. Site URL: `https://<user>.github.io/<repo>/`.

## Data source

All data comes from the public hex.pm REST API. No backend, no API key. Notable endpoints:

- `GET /api/packages?search=&sort=recent_downloads` — autocomplete
- `GET /api/packages/{name}` — metadata, releases list, aggregate downloads
- `GET /api/packages/{name}/releases/{version}?downloads=day` — daily time series for one release
- `GET /api/packages/{name}/releases/{version}?downloads=month` — monthly time series

To stay well within hex.pm rate limits (~100 req/min for anonymous clients) per-release fetches are pooled (max 6 concurrent) and aggressively cached. The first time you load a popular package like `phoenix` (100+ releases) takes several seconds; subsequent loads are instant from cache.
