#!/bin/bash
# © 2022-2024 Luxembourg Institute of Science and Technology

if [ "$1" = "Variscite" ]
then
  base_dir="$(dirname "$0")/variscite"
elif [ "$1" = "RaspberryPi" ]
then  
  base_dir="$(dirname "$0")/raspberry-pi"
fi

light_type=$(curl "http://127.0.0.1:3000/settings/cameraLight")
echo "response: $light_type"

infrared_leds_flag=0
if [ "$light_type" = "infrared" ]
then
  infrared_leds_flag=1
fi

visible_leds_flag=$((1-infrared_leds_flag))

"$base_dir"/light/toggle-ir-leds.sh $infrared_leds_flag
"$base_dir"/light/toggle-visible-leds.sh $visible_leds_flag
