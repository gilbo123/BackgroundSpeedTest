# History

Completed work only — newest first. Active checklist lives in `wiki/current.md`.

### 2026-09-07 — Rotate x-axis tick labels 45°
- `web/static/js/dashboard.js`: x-axis ticks now use `rotation: 45, maxRotation: 45, minRotation: 45` so date labels tilt 45° instead of being horizontal/clipped.
- Verified in browser (screenshot confirms diagonal labels across the 20-day range).
- Local test server killed cleanly (`PORT_FREE` confirmed on 5500).

### 2026-09-07 — Fix `speedtest-cli: No such file or directory`
- `web/server.py`: invoke the CLI as `[sys.executable, '-m', 'speedtest', '--json', '--no-pre-allocate']` instead of the bare `speedtest-cli`.
  - Root cause: on a system without the venv on `PATH` (systemd, `python server.py` from another shell, sandboxed runs), the script lookup fails even when the package is installed in the venv.
  - Bonus: discovered that `speedtest_cli` (the PyPI name) installs as a **deprecated shim** (`speedtest_cli.py`) that only prints a warning and exits — the real module is `speedtest.py`. Verified by reading the venv and by a real `python -m speedtest --simple` run (Ping 53 ms, Down 148 Mbit/s, Up 73 Mbit/s).
- Added a code comment near the `subprocess.run(...)` call explaining both points so it doesn't regress.

### 2026-09-06 — Dashboard UI redesign + server hardening
- **UI modernized** (`web/static/css/dashboard.css`): dark theme with CSS design tokens, stat cards grid, refined Chart.js v4 chart (smooth curves, custom tooltip/legend, dual y-axes).
- **Stat cards** (latest Down/Up/Ping + last test) added to `web/templates/dashboard.html`, populated by `web/static/js/dashboard.js` from a new `last_test` field in `GET /api/data` (`web/server.py`). Values dim when the latest sample is >15 min old.
- **Removed full-page reload** (`<meta refresh>`) in favor of in-place 60s `fetch` + chart `update('none')`.
- **Chart.js v4 served locally** from `web/static/js/chart.umd.js` (no CDN).
- **Server fixes**: `Path(__file__)`-relative paths; cleanup moved out of GET into the background loop; new `GET /health`; `uvicorn` startup moved under `if __name__ == "__main__":`; added `web/backend-speedtest.service` (systemd); `run_server.sh` no longer hardcodes an absolute path.
- Fixed a bug where `dashboard.js` ran before the `<canvas>` existed (scripts moved to end of `<body>`).

### 2026-09-06 — Wiki initialized
- Created `wiki/current.md`, `functionality.md`, `history.md`.
- Project type: Node.js / JavaScript, Python.
- Existing project scanned for a module map.

Recent commits at init (for orientation):
- 76697d7 fix - error checking and refactored balance_data()
- fbc470e feat - added mongoDB
- aba687d admin - updated requirement versions
- 316926a admin - updated requirement versions
- 7c465c8 admin - updated README usage steps, changed interval to 1hr
- 0cfc035 fix - made txt file a const, updated footer
- 89cafa8 fix - made txt file a const, updated footer
- f6652c1 fix - made txt file a const, updated footer
