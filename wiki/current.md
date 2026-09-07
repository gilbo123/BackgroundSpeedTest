# Current work

_Status: idle_

_Live checklist — update this file before code changes and after each step._

Goal: Rotate x-axis tick labels 45° and kill the local server when done.

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