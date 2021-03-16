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
cd /var/app

npm install -g npm
npm install --force --build-from-source

echo "Container ready to start tests !"

./features/run.sh