#!/usr/bin/env bash

#ENV=/path/to/.virtualenv/your_env

#set -e
#source $ENV/bin/activate 

#check requirements file exists
cd /home/trial/git/BackgroundSpeedTest/
FILE=web/server.py

if [[ "$VIRTUAL_ENV" != "" ]]; then 
    echo "You are in working virtualenv $VIRTUAL_ENV";
    if [[ -f "$FILE" ]]; then
	    #run the server
	    echo "";
	    echo "Running server in the background...";
	    python3 $FILE;
    else 
	echo "$FILE does not exist.";
	    echo "Exiting...";
    fi

else
    echo "You are not working in a virtual environment...";
    printf "Do you want to run the server anyway? (y/n): ";
    read answer;
    if [ "$answer" != "${answer#[Yy]}" ]; then
	    echo "";
	    echo "Running server in the background...";
	    python $FILE;
    else
	    echo "Exiting...";
    fi
fi

