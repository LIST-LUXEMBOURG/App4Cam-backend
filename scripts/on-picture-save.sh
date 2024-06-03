#!/bin/bash
# © 2024 Luxembourg Institute of Science and Technology

echo "full filename: $1"

/home/app4cam/app4cam-backend/scripts/write-device-id-to-jpg-file.sh "$1"

if [ "$2" = "RaspberryPi" ]
then
    temp=$(/home/app4cam/app4cam-backend/scripts/raspberry-pi/air-temperature/read_air_temp)
    echo "Air temperature: $temp"

    /home/app4cam/app4cam-backend/scripts/raspberry-pi/air-temperature/write-air-temperature-to-jpg-file.sh "$1" "$temp"
fi
