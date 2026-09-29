# Current work

_Status: in-progress_

**Goal (2026-09-29):** Fix spurious multi-day ping values (e.g. 1,800,000 ms) appearing for long stretches while download/upload look fine — treat extreme ping as a speedtest measurement glitch (clamp/filter bad samples). Also add a faint trend line over the download-speed dataset in the chart.

_Live checklist — update this file before code changes and after each step._

- [x] Investigate how ping is captured/stored (`web/server.py` runner + storage) and why 1.8M ms values persist — raw `data['ping']` saved verbatim; no validation anywhere
- [x] Decide handling: **clamp at capture** (ping > 5000 ms stored as `null` → chart gap) + **filter at API** (`PING_MS_MAX` applied in `api_data` so existing bad Mongo records are fixed too, no migration)
- [x] Implement ping outlier handling in `server.py` (capture cap + API filter, `PING_MS_MAX`)
- [x] Fix Pylance type error: widen `get_speed_test_data` pings to `list[float | None]`
- [ ] `stat-ping` card: handle null ping gracefully (HTML `ms` suffix edit pending)
- [ ] `dashboard.js`: add faint trend line (e.g. moving average) dataset for download speeds — implemented, needs visual verify
- [ ] Verify in browser (Day + another view) and check stats card no longer shows absurd ping
- [ ] Update wiki (functionality.md, history.md), reset status to idle

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