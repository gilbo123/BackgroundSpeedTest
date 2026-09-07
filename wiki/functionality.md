# Functionality — BackgroundSpeedTest

_Project type: Node.js / JavaScript, Python_

## Overview

<!-- PROJECT SHIELDS --> <!-- *** I'm using markdown "reference style" links for readability. *** Reference links are enclosed in brackets [ ] instead of parentheses ( ). *** See the bottom of this document for the declaration of the reference variables *** for build-url, contributors-url, etc. This is an optional, concise syntax you may use. *** https://www.markdownguide.org/basic-syntax/#reference-style-links --> [![Build Status][build-shield]][build-url] [![Contributors][contributors-shield]][contributors-url] [![MIT License][license-shield]][license-url] [![LinkedIn][linkedin-shield]][linkedin-url]

## UI / dashboard (redesign, 2026-09-06)

Modern dark theme. Structure (top → bottom):
- **Header** (`.header` / `.header-content`): brand mark + title/subtitle on the left; a **status pill** (`.status-pill`, `#status-dot`) on the right showing the date range and a live/error indicator.
- **Stat cards** (`.stats-grid` → `.stat-card`): Latest **Download**, **Upload**, **Latency (ping)**, and **Last test** time. Populated by `web/static/js/dashboard.js` from the `last_test` object in `/api/data`. Values auto-dim (`.is-stale`) when the newest sample is older than 15 min.
- **Chart card** (`.chart-card` → `.chart-holder` → `#combinedChart`): single Chart.js v4 line chart, 3 datasets (download/upload on `y-speed` left axis, ping on `y-ping` right axis).
- **Footer** (`.footer` / `.footer-content`).

Key files:
- `web/static/css/dashboard.css` — all styling; design tokens are CSS vars in `:root` (colors, radius, shadows, fonts).
- `web/static/js/dashboard.js` — fetches `/api/data`, fills stat cards + chart, refreshes in place every 60s, no page reload.
- `web/static/js/chart.umd.js` — locally served Chart.js v4 (installed via npm, copied here; no CDN).
- `web/templates/dashboard.html` — pure markup shell (no inline JS/data).

Server API (see `web/server.py`):
- `GET /` — renders `dashboard.html`.
- `GET /api/data` — JSON: `dates`, `uploads`, `downloads`, `pings`, units, `days`, and `last_test` `{date,download,upload,ping,time,ts}`.
- `GET /health` — liveness: Mongo ping, test thread alive, uptime.
- Background thread runs `speedtest-cli` every `test_interval` and writes to Mongo; also performs record cleanup (no longer done inside GETs).

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
