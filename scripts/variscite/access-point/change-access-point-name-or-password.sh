#!/bin/bash
# © 2024 Luxembourg Institute of Science and Technology

CONNECTION_NAME=WIFI_AP

show_help() {
cat << EOF
Usage: ${0##*/} [-h] [-n NAME] [-p PASSWORD]
Turn off the WiFi access point, update the name or password, and turn it on again.

    -h           display this help and exit
    -n NAME      change the access point name to NAME
    -p PASSWORD  change the access point password to PASSWORD

EOF
}

name=""
password=""

OPTIND=1
while getopts :hn:p: opt; do
  case $opt in
    h)
      show_help
      exit 0
      ;;
    n)
      name=$OPTARG
      ;;
    p)
      password=$OPTARG
      ;;
    :)
      echo "Option -$OPTARG requires an argument." >&2
      exit 1
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      exit 1
      ;;
    *)
      show_help
      exit 1
      ;;
  esac
done
shift "$((OPTIND-1))"

if [[ -z $name && -z $password ]]
then
  show_help
  exit 1
fi

nmcli con down "$CONNECTION_NAME"
if [ -n "$name" ]
then
  nmcli con modify "$CONNECTION_NAME" ssid "$name"
fi
if [ -n "$password" ]
then
  nmcli con modify "$CONNECTION_NAME" 802-11-wireless-security.psk "$password"
fi
nmcli con up "$CONNECTION_NAME"
