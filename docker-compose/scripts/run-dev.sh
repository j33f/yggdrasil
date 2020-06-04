#!/usr/bin/env bash

if [ -f /etc/timezone ]; then
    echo "Timezone is set to $(cat /etc/timezone)"
else
    if [[ -z "${TIMEZONE}" ]]; then
      SETUP_TIMEZONE="Europe/Paris"
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

if [ -d /var/app/node_modules ]; then
    echo "No need to install packages."
else
    echo "Install packages"
    npm install --force --build-from-source
fi

echo "[$(date)] - Starting..."

exec pm2-runtime /var/pm2Config/config.json --raw