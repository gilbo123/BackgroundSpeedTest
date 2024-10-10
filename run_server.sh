#!/usr/bin/env bash

#ENV=/home/trial/.virtualenv/dev

#set -e
#source $ENV/bin/activate 


if [[ "$VIRTUAL_ENV" != "" ]]; then 
    echo "You are in working virtualenv $VIRTUAL_ENV";
    #check requirements file exists
    cd /home/trial/git/BackgroundSpeedTest/
    FILE=web/server.py
    if [[ -f "$FILE" ]]; then
	#run the server
	echo "";
	echo "Running server in the background...";
	python $FILE;
    else 
	echo "$FILE does not exist.";
	echo "Exiting...";
    fi

else
    echo "You are not working in a virtual environment...";
    echo "Exiting.";
fi

