
<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for build-url, contributors-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![Build Status][build-shield]][build-url]
[![Contributors][contributors-shield]][contributors-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]



<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/gilbo123/BackgroundSpeedTest">
    <img src="web/static/images/speedo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Background Speed Test Server</h3>

  <p align="center">
    An awesome README template to jumpstart your projects!
    <br />
    <a href="https://github.com/gilbo123/BackgroundSpeedTest"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/gilbo123/BackgroundSpeedTest">View Demo</a>
    ·
    <a href="https://github.com/gilbo123/BackgroundSpeedTest/issues">Report Bug</a>
    ·
    <a href="https://github.com/gilbo123/BackgroundSpeedTest/issues">Request Feature</a>
  </p>
</p>



<!-- TABLE OF CONTENTS -->
## Table of Contents

* [About the Project](#about-the-project)
  * [Built With](#built-with)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [Usage](#usage)
* [Roadmap](#roadmap)
* [Contributing](#contributing)
* [License](#license)
* [Contact](#contact)
* [Acknowledgements](#acknowledgements)



<!-- ABOUT THE PROJECT -->
## About The Project

[![Product Name Screen Shot][product-screenshot]](https://example.com)

This project generates a continous timed event where Speedtest (CLI version) is used to gather download and upload information. The reults are saved to a simple text file before being plotted on a FastApi endpoint. The test file is used as the time period should not exceed a few months. The program will automatically delete old data from the same file.

Features:
* Lightweight storage (text file) - no databases.
* Responsive rea-time graphical display of data.
* Adjustable period and frequency.

### Built With

Frameworks used in the application:

* [![FastAPI][https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi]](https://fastapi.tiangolo.com)


<!-- GETTING STARTED -->
## Getting Started

This application is inteded to run on a server such as a Raspberry Pi or other local server attached to your modem or router by ethernet cable to get the best results.

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.
* npm
```sh
npm install npm@latest -g
```
```sh
npm install chart.js
```

### Installation

1. Clone the repo
```sh
git clone https://github.com/gilbo123/BackgroundSpeedTest.git
```
```sh
cd BackGroundSpeedTest
```
3. Install requirements
```sh
pip3 install -r requirements.txt
```
4. Run the application
```sh
sh run_server.sh
```

<!-- USAGE EXAMPLES -->
## Usage

```python
# Define routes and functions
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Root page. Redndered in a Jinja Template."""

    # Get the data and send to TemplateRepsonse
    dates, uploads, downloads = parse_text_file()
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "data": [{"dates": dates, "uploads": uploads, "downloads": downloads}],
        },
    )
```

```python
uvicorn.run(app, host=THIS_IP, port=THIS_PORT)
```


_For more examples, please refer to the [Documentation](https://example.com)_



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.



<!-- CONTACT -->
## Contact

Your Name - [@your_twitter](https://twitter.com/your_username) - email@example.com

Project Link: [https://github.com/your_username/repo_name](https://github.com/your_username/repo_name)



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[build-shield]: https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square
[build-url]: #
[contributors-shield]: https://img.shields.io/github/contributors/gilbo123/BackgroundSpeedTest.svg?style=flat-square
[contributors-url]: https://github.com/gilbo123/BackgroundSpeedTest/graphs/contributors
[license-shield]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[license-url]: https://github.com/gilbo123/BackgroundSpeedTest/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=flat-square&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com
[product-screenshot]: images/screenshot.png
