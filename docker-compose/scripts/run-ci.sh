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

npm install -g npm
npm install --force --build-from-source

echo "[$(date)] - Starting..."

npm run test:functional
FUNC_TESTS_EXIT_CODE=$? # store the tests exit code

if [ $FUNC_TESTS_EXIT_CODE -eq 0 ]
then
  echo ''
  echo ''
  echo -e "\e[32mFunctional tests passed !\e[0m"
  echo ''
  echo ''

  npm run unit:coverage-summary

  exit 0
else
  echo ''
  echo ''
  echo -e "\e[31Functional tests failed...\e[0m"
  echo ''
  echo ''

  exit $FUNC_TESTS_EXIT_CODE
fi