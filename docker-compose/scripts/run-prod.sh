#!/usr/bin/env bash

function setup_tz {
  apk add --no-cache --no-progress tzdata
  cp /usr/share/zoneinfo/${SETUP_TIMEZONE} /etc/localtime
  echo "${SETUP_TIMEZONE}" > /etc/timezone
  apk del tzdata
  echo "Timezone is now set to $(< /etc/timezone)"
}

if [[ -z "${TIMEZONE}" ]]; then
  if [ -f /etc/timezone ]; then
    echo "Timezone is set to $(cat /etc/timezone)"
  else
    SETUP_TIMEZONE="$(< /var/app/timeZone)"
    echo "Need to setup TZ to ${SETUP_TIMEZONE} (default)"
    setup_tz
  fi
else
  if [ -f /etc/timezone ]; then
    echo "Timezone is set to $(cat /etc/timezone)"
    if [[ $(< /etc/timezone) != "${TIMEZONE}" ]]; then
      SETUP_TIMEZONE="${TIMEZONE}"
      echo "Need to change to ${SETUP_TIMEZONE}"
      setup_tz
    else
      echo "No need to change TZ"
    fi
  else
    SETUP_TIMEZONE="${TIMEZONE}"
    echo "Need to setup TZ to ${SETUP_TIMEZONE} (custom)"
    setup_tz
  fi
fi

echo "[$(date)] - Starting..."
exec pm2-runtime /var/pm2Config/config.json --raw