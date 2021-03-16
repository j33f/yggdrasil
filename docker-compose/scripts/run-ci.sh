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

mkdir -p /root/.npm
sudo chown -R 1001:1002 /root/.npm
chmod /var/app/node_modules/nyc/bin/nyc.js

npm install -g npm
npm install -g nyc
npm install --force --build-from-source

echo "Container ready to start tests !"

tail -f /dev/null