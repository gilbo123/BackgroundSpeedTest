from __future__ import annotations

from argparse import ArgumentParser, Namespace
from datetime import datetime, timedelta
import os
from threading import Thread
from time import sleep, strptime
from typing import Any
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, StreamingResponse
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
            
            # Run speedtest and capture output
            result = subprocess.run(
                ['speedtest-cli', '--json', '--no-pre-allocate'], 
                capture_output=True, 
                text=True,
                check=True
            )
            
            if result.returncode == 0:
                # Parse JSON output
                data = json.loads(result.stdout)
                
                # Store in MongoDB
                speed_tests.insert_one({
                    'date': current_time,
                    'date_str': current_time.strftime("%d-%b-%y"),
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
                
        except Exception as e:
            print(f"Error running speedtest: {e}")
            # If we get an error, wait a bit longer before the next attempt
            sleep(30)
            continue

        print(
            f"Speedtest complete at {datetime.now()}. Sleeping for {speedtest_interval} seconds..."
        )
        sleep(speedtest_interval)

    print("Exiting speedtest thread...")


def get_speed_test_data() -> tuple[list[str], list[float], list[float], list[float]]:
    """
    Query MongoDB for speed test data within the specified time range.
    Returns lists of dates, upload speeds, download speeds, and ping times.

    Returns:
        tuple[list[str], list[float], list[float], list[float]]: Lists of dates and values
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
    
    # Process results
    for doc in cursor:
        dates.append(doc['date_str'])
        uploads.append(doc['upload'])
        downloads.append(doc['download'])
        pings.append(doc['ping'])
    
    # Clean up old records
    cleanup_date = datetime.now() - timedelta(days=KEEP_RECORDS_FOR)
    speed_tests.delete_many({'date': {'$lt': cleanup_date}})
    
    return dates, uploads, downloads, pings


###################################
##########SCRIPT##########
###################################

# The APP
app = FastAPI()
app.mount(
    "/static",
    StaticFiles(directory="web/static"),
    name="static",
)
templates = Jinja2Templates(directory="web/templates")

# read the .yaml file
with open("config.yaml", "r") as file:
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
    """Root page. Rendered in a Jinja Template."""

    # Get the data and send to TemplateResponse
    dates, uploads, downloads, pings = get_speed_test_data()
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "data": [{"dates": dates, "uploads": uploads, "downloads": downloads, "pings": pings}],
        },
    )


# local IP - server
THIS_IP = "0.0.0.0"

# set up the UDP THREAD
st_thread: Thread = Thread(target=run_speed_test, args=(INTERVAL,), daemon=True)
st_thread.daemon = True
st_thread.start()

# Run the server
uvicorn.run(app, host=THIS_IP, port=PORT)

print("Exiting application...")
