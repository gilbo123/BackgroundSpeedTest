# Functionality — BackgroundSpeedTest

_Project type: Node.js / JavaScript, Python_

## Overview

<!-- PROJECT SHIELDS --> <!-- *** I'm using markdown "reference style" links for readability. *** Reference links are enclosed in brackets [ ] instead of parentheses ( ). *** See the bottom of this document for the declaration of the reference variables *** for build-url, contributors-url, etc. This is an optional, concise syntax you may use. *** https://www.markdownguide.org/basic-syntax/#reference-style-links --> [![Build Status][build-shield]][build-url] [![Contributors][contributors-shield]][contributors-url] [![MIT License][license-shield]][license-url] [![LinkedIn][linkedin-shield]][linkedin-url]

## UI / dashboard (redesign 2026-09-06, views + favicon 2026-09-10)

Modern dark theme. Structure (top → bottom):
- **Header** (`.header` / `.header-content`): brand mark (⚡, `#fbbf24`) + title/subtitle on the left; a **status pill** (`.status-pill`, `#status-dot`) on the right showing the current window range and a live/error indicator.
- **Favicon**: inline SVG data-URI in `dashboard.html` (⚡ on dark rounded square) matching the header brand — no separate file.
- **Stat cards** (`.stats-grid` → `.stat-card`): Latest **Download**, **Upload**, **Latency (ping)**, and **Last test** time. Populated by `web/static/js/dashboard.js` from the `last_test` object in `/api/data`. Values auto-dim (`.is-stale`) when the newest sample is older than 15 min.
- **Chart card** (`.chart-card` → `.chart-holder` → `#combinedChart`): single Chart.js v4 line chart, 3 datasets (download/upload on `y-speed` left axis, ping on `y-ping` right axis).
  - **View toggle** (`.view-toggle` in the chart-card header): `Day / Week / Month / Year` pill buttons; choice persists in `localStorage[bgt_view]` (default = Month).
  - Dynamic subtitle (`#days-range`) shows "over the past 24 hours / week / 30 days / year" depending on the active view.
- **Footer** (`.footer` / `.footer-content`).

Views and x-axis label formats (set in `web/server.py: VIEW_LABEL_FMT`):

| View  | Window                     | Tick label |
|-------|----------------------------|------------|
| Day   | 24 h                       | `10 Sep, 14:25` |
| Week  | 7 d                        | `Thu 10`   |
| Month | 30 d                       | `10 Sep`   |
| Year  | capped at `keep_records_for` (config) | `Sep 26`   |

Key files:
- `web/static/css/dashboard.css` — all styling; design tokens are CSS vars in `:root` (colors, radius, shadows, fonts). Includes `.view-toggle` styling + hover/focus + responsive state.
- `web/static/js/dashboard.js` — fetches `/api/data?view=…`, fills stat cards + chart, refreshes in place every 60s, no page reload. Owns view state (localStorage).
- `web/static/js/chart.umd.js` — locally served Chart.js v4 (installed via npm, copied here; no CDN).
- `web/templates/dashboard.html` — markup shell with the inline-SVG favicon and the view-toggle buttons; no inline JS or data.

Server API (see `web/server.py`):
- `GET /` — renders `dashboard.html`.
- `GET /api/data` — JSON: `dates` (view-formatted labels), `ts` (unix seconds), `uploads`, `downloads`, `pings`, units, `days` (window used), `view` (echo of `?view` if valid, else `null`), and `last_test` `{date,download,upload,ping,time,ts}`. Accepts `?view=day|week|month|year` or `?days=N`; window is always capped to `keep_records_for`.
- `GET /health` — liveness: Mongo ping, test thread alive, uptime.
- Background thread runs `speedtest` (`python -m speedtest`) every `test_interval` and writes to Mongo; also performs record cleanup (no longer done inside GETs).

## How to target work

Match the user's request to a module below, then open only that module's paths.
Examples: "update the UI" → `ui`. "fix the API" → `api` or `server`. "change the schema" → `db` / `models`.

## Modules

<!-- reignit:modules:start -->

### web (`web/`)

Owns `web/`. Describe this module's role here.

Key paths:
- `web/static/css/dashboard.css`
- `web/static/images/graph.png`
- `web/static/images/logo.png`
- `web/static/images/logo_bg_white.png`
- `web/static/js/chart.umd.js`
- `web/static/js/dashboard.js`
- `web/templates/dashboard.html`
- `web/backend-speedtest.service`
- `web/server.py`

<!-- reignit:modules:end -->
