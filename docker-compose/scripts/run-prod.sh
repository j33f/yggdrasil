#!/usr/bin/env bash

if [  !-f /etc/timezone ]; then
    if [[ -z "${TIMEZONE}" ]]; then
      SETUP_TIMEZONE=$(cat /var/app/timeZone);
    else
      SETUP_TIMEZONE="${TIMEZONE}"
    fi
    echo "Need to set the timezone"
    apk add --no-cache --no-progress tzdata
    cp /usr/share/zoneinfo/${SETUP_TIMEZONE} /etc/localtime
    echo "${SETUP_TIMEZONE}" > /etc/timezone
    apk del tzdata
    echo "Timezone is now set to $(cat /etc/timezone)"
fi

echo "[$(date)] - Starting..."

exec pm2-runtime /var/pm2Config/config.json --raw