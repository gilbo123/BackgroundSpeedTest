# Current work

_Status: idle_

**Completed (2026-09-29):** Ping outlier sanitizer (`PING_MS_MAX` cap, glitch → null → chart gap; fixed at capture and at API for legacy rows) + faint dashed download-trend (moving average) dataset. See `wiki/history.md`.

_Live checklist — update this file before code changes and after each step._

- [x] Investigate how ping is captured/stored (`web/server.py` runner + storage) and why 1.8M ms values persist — raw `data['ping']` saved verbatim; no validation anywhere
- [x] Decide handling: **clamp at capture** (ping > 5000 ms stored as `null` → chart gap) + **filter at API** (`PING_MS_MAX` applied in `api_data` so existing bad Mongo records are fixed too, no migration)
- [x] Implement ping outlier handling in `server.py` (capture cap + API filter, `PING_MS_MAX`)
- [x] Fix Pylance type error: widen `get_speed_test_data` pings to `list[float | None]`
- [x] `stat-ping` card: null ping renders as “—” (dashboard.js null guard)
- [x] `dashboard.js`: faint dashed moving-average trend-line dataset for downloads
- [x] Verify in browser (Month view: trend line visible, ping axis sane) + API seed test (1.8M ms → null)
- [x] Update wiki (functionality.md, history.md), reset status to idle

- [x] `server.py`: `get_speed_test_data(days)` + `/api/data?view=` (capped at keep_records_for); per-view x labels (day="10 Sep, 14:25", week="Thu 10", month="10 Sep", year="Sep 26"); added `ts` + `view` fields
- [x] `dashboard.html`: Day/Week/Month/Year toggle in chart header; dynamic subtitle; inline SVG ⚡ favicon
- [x] `dashboard.js`: applies views, fetches `/api/data?view=`, persists in localStorage, updates subtitle/pill/stats
- [x] `dashboard.css`: view-toggle styling + hover/focus + responsive states
- [x] Verify all 4 views in browser (labels, formats, data)
- [x] Rewrite README (typos, Mongo, config, views, systemd)
- [x] Update wiki; log history; status idle

- [x] Set maxRotation=45 and rotation=45 on x-axis ticks in dashboard.js
- [x] Reload browser to confirm
- [x] Kill local server (clean uvicorn shutdown, PORT_FREE confirmed)
- [x] Reset status to idle

- [x] Replace `subprocess.run(['speedtest-cli', ...])` with `[sys.executable, '-m', 'speedtest', ...]` (NOTE: real module is `speedtest`; `speedtest_cli` is a deprecated shim that exits with a warning)
- [x] Verify the module name exists in the venv (`python -m speedtest --help` + real `--simple` run: Ping 53.5 ms, Down 148 Mbit/s, Up 73 Mbit/s)
- [x] Restart server and confirm a test actually runs (no ENOENT — new log shows clean startup, first test in flight)
- [x] Prepend entry to `wiki/history.md` and reset status to idle

- [x] Review current dashboard.css / dashboard.html
- [x] Redesign CSS (modern dark theme, layout, stat cards)
- [x] Add stat cards (latest download/upload/ping + last test time) to template
- [x] Extend dashboard.js to populate stat cards from /api/data
- [x] Add /api/summary endpoint (or compute client-side)
- [x] Verify in browser
- [x] Update wiki (functionality.md, history.md), reset status to idle