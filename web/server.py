from __future__ import annotations

from datetime import datetime, timedelta
from threading import Thread
import sys
import time
from time import sleep
from pathlib import Path
from typing import Any
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
import subprocess
import json
import uvicorn
import yaml

# MongoDB setup
client = MongoClient('mongodb://localhost:27017/')
db: Database = client['speedtest_db']
speed_tests: Collection = db['speed_tests']

# Create indexes for better query performance
speed_tests.create_index('date')

def cleanup_old_records() -> None:
    """Delete speed test records older than KEEP_RECORDS_FOR days.

    Runs from the background speed test loop (once per test) rather than
    from dashboard requests, so GET handlers stay read-only.
    """
    cleanup_date = datetime.now() - timedelta(days=KEEP_RECORDS_FOR)
    deleted = speed_tests.delete_many({'date': {'$lt': cleanup_date}})
    if deleted.deleted_count:
        print(f"Cleaned up {deleted.deleted_count} old speed test record(s)")

def run_speed_test(speedtest_interval: int) -> None:
    """Run the speedtest-cli and save the output to MongoDB

    This function will run the speedtest-cli and save the output to MongoDB
    forever. The function will run at specified intervals to keep the
    data up to date.

    Args:
        speedtest_interval: The interval in seconds between speed tests

    Returns:
        None
    """
    sleep(1)

    # Run the speedtest-cli and save the output to MongoDB
    while True:
        print("Running speedtest. Please wait....")
        try:
            # Get current timestamp
            current_time = datetime.now()
            
            # Run speedtest and capture output.
            #
            # We invoke the CLI as `python -m speedtest` (NOT `speedtest-cli`)
            # so it works under systemd / with a venv that isn't on PATH.
            # `speedtest-cli` (the `speedtest_cli` module) is a deprecated
            # shim in 2.1.3 that only prints a warning; `speedtest` is the
            # real module.
            #
            # No check=True here: we want to inspect the return code below
            # (CalledProcessError would jump straight to the except block).
            # timeout kills the process if it hangs, so the loop can never
            # stall forever.
            result = subprocess.run(
                [sys.executable, '-m', 'speedtest', '--json', '--no-pre-allocate'],
                capture_output=True,
                text=True,
                timeout=180
            )
            
            if result.returncode == 0:
                # Parse JSON output
                data = json.loads(result.stdout)
                
                # Store in MongoDB
                speed_tests.insert_one({
                    'date': current_time,
                    'date_str': current_time.strftime("%d-%b-%y"),
                    'date_label': current_time.strftime("%d %b, %H:%M"),
                    'download': float(data['download']) / 1_000_000,  # Convert to Mbps
                    'upload': float(data['upload']) / 1_000_000,  # Convert to Mbps
                    'ping': float(data['ping']),
                })
                print("Successfully saved speed test results to MongoDB")
            
            elif result.returncode == 2:
                print("Keyboard interrupt. Exiting...")
                break
            elif result.returncode == 512:
                print("NO INTERNET!")
                # Save zeros
                speed_tests.insert_one({
                    'date': current_time,
                    'date_label': current_time.strftime("%d %b, %H:%M"),
                    'date_str': current_time.strftime("%d-%b-%y"),
                    'download': 0.0,
                    'upload': 0.0,
                    'ping': 0.0
                })
            else:
                print(f"Error running speedtest. Return code: {result.returncode}")
                print(f"Error output: {result.stderr}")
                # If we get an error, wait a bit longer before the next attempt
                sleep(30)
                continue
                
        except subprocess.TimeoutExpired:
            # subprocess.run() already killed the hung process for us.
            print(f"Speedtest timed out after 180 seconds; retrying...")
            # If we get an error, wait a bit longer before the next attempt
            sleep(30)
            continue
        except Exception as e:
            print(f"Error running speedtest: {e}")
            # If we get an error, wait a bit longer before the next attempt
            sleep(30)
            continue

        # Clean up old records in the background loop (keeps GETs read-only)
        try:
            cleanup_old_records()
        except Exception as e:
            print(f"Record cleanup failed: {e}")

        print(
            f"Speedtest complete at {datetime.now()}. Sleeping for {speedtest_interval} seconds..."
        )
        sleep(speedtest_interval)

    print("Exiting speedtest thread...")


def get_speed_test_data() -> tuple[list[str], list[float], list[float], list[float], datetime | None]:
    """
    Query MongoDB for speed test data within the specified time range.
    Returns lists of dates, upload speeds, download speeds, ping times,
    and the datetime of the most recent test (or None if no data).

    Returns:
        tuple with date labels, value lists, and last test time
    """
    # Calculate the cutoff date
    cutoff_date = datetime.now() - timedelta(days=DAYS)
    
    # Query MongoDB for recent records
    cursor = speed_tests.find(
        {'date': {'$gt': cutoff_date}},
        sort=[('date', 1)]  # Sort by date ascending
    )
    
    # Initialize lists
    dates: list[str] = []
    uploads: list[float] = []
    downloads: list[float] = []
    pings: list[float] = []
    last_time: datetime | None = None

    # Process results (documents arrive sorted ascending, so the last one wins)
    for doc in cursor:
        dates.append(doc['date_str'])
        uploads.append(doc['upload'])
        downloads.append(doc['download'])
        pings.append(doc['ping'])
        last_time = doc['date']

    return dates, uploads, downloads, pings, last_time


###################################
##########SCRIPT##########
###################################

# The APP
app = FastAPI()

# Resolve paths relative to this file so the server works from any CWD
APP_ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = APP_ROOT / "web" / "static"
TEMPLATES_DIR = APP_ROOT / "web" / "templates"
CONFIG_FILE = APP_ROOT / "config.yaml"

app.mount(
    "/static",
    StaticFiles(directory=str(STATIC_DIR)),
    name="static",
)
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# read the .yaml file
with open(CONFIG_FILE, "r") as file:
    config: dict[str, Any] = yaml.safe_load(file)


# Constants
INTERVAL: int = int(config["test_interval"])
DAYS: int = int(config["days"])
KEEP_RECORDS_FOR: int = int(config["keep_records_for"])
PORT: int = int(config["port"])

###################################
##########ROUTES##########
###################################


# Define routes and functions
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Root page. Rendered in a Jinja Template.

    The page loads its chart data from /api/data and refreshes it
    in place; no initial data is rendered into the HTML.
    """
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request},
    )


@app.get("/api/data")
def api_data() -> dict[str, Any]:
    """JSON speed test data for the last DAYS days, sorted ascending by date.

    Includes a last_test field (latest sample + timestamp) used by the
    dashboard's stat cards.
    """
    dates, uploads, downloads, pings, last_time = get_speed_test_data()
    if dates:
        last_test = {
            "date": dates[-1],
            "download": downloads[-1],
            "upload": uploads[-1],
            "ping": pings[-1],
            "time": last_time.strftime("%d %b %Y, %H:%M") if last_time else None,
            "ts": int(last_time.timestamp()) if last_time else None,  # unix seconds, for staleness checks
        }
    else:
        last_test = None
    return {
        "dates": dates,
        "uploads": uploads,
        "downloads": downloads,
        "downloads_units": "Mbps",
        "uploads_units": "Mbps",
        "pings": pings,
        "pings_units": "ms",
        "days": DAYS,
        "last_test": last_test,
    }


@app.get("/health")
def health() -> dict[str, Any]:
    """Liveness endpoint for monitoring or a reverse proxy."""
    mongo_ok = False
    try:
        client.admin.command('ping')
        mongo_ok = True
    except Exception:
        pass
    return {
        "status": "ok" if mongo_ok else "degraded",
        "mongodb": mongo_ok,
        "thread_alive": st_thread.is_alive() if st_thread else False,
        "uptime_seconds": round(time.time() - START_TIME, 1),
    }


# local IP - server
THIS_IP = "0.0.0.0"

# Track process start time for the /health endpoint
START_TIME: float = time.time()

# set up the speed test thread (started in main, see __main__ guard)
st_thread: Thread | None = None


def start_speedtest_thread() -> None:
    """Start the daemon thread that runs periodic speed tests."""
    global st_thread
    st_thread = Thread(target=run_speed_test, args=(INTERVAL,), daemon=True)
    st_thread.start()
    print(f"Speed test thread started (interval: {INTERVAL}s)")


if __name__ == "__main__":
    start_speedtest_thread()
    # Run the server
    uvicorn.run(app, host=THIS_IP, port=PORT, log_level="info")
