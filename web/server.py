from argparse import ArgumentParser, Namespace
from datetime import datetime
import os
from threading import Thread
from time import sleep, strptime
from typing import Any
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import uvicorn


def run_speed_test(interval: int) -> None:
    """Run the speedtest-cli and save the output to a file forever

    This function will run the speedtest-cli and save the output to a file
    forever. The function will run every second. This is done to keep the
    data up to date. The function will run forever. The function will not
    return anything. The function will run the speedtest-cli and save the
    output to a file. The function will then run the client.py script to
    send the data to the server. The function will then sleep for 1 second

    Args:
        None

    Returns:
        None

    """

    # check the file exists
    if not os.path.exists("web/static/speedtest.txt"):
        os.system("touch web/static/speedtest.txt")

    sleep(1)

    # Run the speedtest-cli and save the output to a file
    while True:
        print("Running speedtest. Please wait....")
        try:
            result: int = os.system(
                "printf '\n~~~~~\nDate: ' >> web/static/speedtest.txt"
            )
            result: int = os.system(
                "date '+%d-%m-%Y %H:%M:%S' >> web/static/speedtest.txt"
            )
            result: int = os.system("speedtest >> web/static/speedtest.txt")
            if result == 0:
                # command ran successfully
                pass
            elif result == 2:
                print("Keyboard interupt. Exiting...")
                break
            # check 512 no internet
            elif result == 512:
                print("NO INTERNET!")
                # save zeros

            else:
                print(f"Error running speedtest. Return code: {result}")
        except Exception as e:
            print(f"Error running speedtest: {e}")

        # loop every 60 seconds
        print(
            f"Speedtest complete at {datetime.now()}. Sleeping for {interval} seconds..."
        )
        sleep(interval)

    # Done
    print("Exiting speedtest thread...")


def parse_text_file():
    """
    Parse the text file (speedtest.txt) and find the all the
    Values for the Keys 'Date:', 'Upload', and 'Download'.
    Return the list of mappings with datetime and values.

    Args:
        None

    Returns:
        list[dict[str, Any]]: List of mappings with datetime and values

    """

    # open the file
    with open("web/static/speedtest.txt", "r") as file:
        text: str = file.read()

    # split the file into chunks
    chunks: list[str] = text.split("\n~~~~~\n")

    # loop through the chunks
    dates: list[str] = []
    uploads: list[float] = []
    downloads: list[float] = []
    pings: list[float] = []  # New list for ping data
    for chunk in chunks:
        # split the chunk into lines
        new_lines: list[str] = chunk.split("\n")

        # if only date, add zeros
        if len (new_lines) == 2:
            dt: str = new_lines[0].split("Date: ")[1].strip()
            dt: datetime = datetime.strptime(dt, "%d-%m-%Y %H:%M:%S")
            date: str = dt.strftime("%d-%b-%y")
            dates.append(date)
            uploads.append(0.0)
            downloads.append(0.0)
            pings.append(0.0)  # Add ping data to the list

        # check if the chunk has the correct number of lines
        if len(new_lines) < 3:
            continue
        

        # get the values
        upload: str = ""
        download: str = ""
        date: str = ""
        ping: str = ""  # New variable for ping
        for line in new_lines:
            if line == "":
                continue
            try:
                if "Upload" in line:
                    upload: str = line.split(":")[1].strip().split(" Mbps")[0].strip()
                elif "Download" in line:
                    download: str = line.split(":")[1].strip().split(" Mbps")[0].strip()
                elif "Date" in line:
                    dt: str = line.split("Date: ")[1].strip()
                    dt: datetime = datetime.strptime(dt, "%d-%m-%Y %H:%M:%S")
                    date: str = dt.strftime("%d-%b-%y")
                elif "Latency" in line:  # New condition to parse ping data
                    ping: str = line.split(":")[1].strip().split(" ms")[0].strip()

                # append the values to the data lists
                if upload != "" and download != "" and date != "" and ping != "":
                    dates.append(date)
                    uploads.append(float(upload))
                    downloads.append(float(download))
                    pings.append(float(ping))  # Add ping data to the list
                

            except Exception as e:
                print(f"Error parsing line: {e}")
                continue

    # return the data
    return dates, uploads, downloads, pings  # Include pings in the return statement


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


# command line args
parser: ArgumentParser = ArgumentParser()
parser.add_argument(
    "--months-to-plot",
    type=int,
    default=3,
    help="Number of months data to plot in the graph",
)
parser.add_argument(
    "--test-interval-seconds",
    type=int,
    default=600,
    help="Seconds between speed tests",
)
# Options
opt: Namespace = parser.parse_args()

# Constants
INTERVAL: int = opt.test_interval_seconds
MONTHS: int = opt.months_to_plot


###################################
##########ROUTES##########
###################################


# Define routes and functions
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Root page. Redndered in a Jinja Template."""

    # Get the data and send to TemplateRepsonse
    dates, uploads, downloads, pings = parse_text_file()
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "data": [{"dates": dates, "uploads": uploads, "downloads": downloads, "pings": pings}],
        },
    )


# IP and Port
THIS_IP = "0.0.0.0"
THIS_PORT = 5500

# set up the UDP THREAD
st_thread: Thread = Thread(target=run_speed_test, args=(INTERVAL,), daemon=True)
st_thread.daemon = True
st_thread.start()

# Run the server
uvicorn.run(app, host=THIS_IP, port=THIS_PORT)

# print(parse_text_file())

print("Exiting application...")
