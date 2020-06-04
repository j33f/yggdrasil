#!/bin/sh

set -e

ATTEMPTSr=0
MAX_ATTEMPTSr=60

if [ -f /etc/timezone ]; then
    echo "Timezone is set to $(cat /etc/timezone)"
else
    echo "Need to set the timezone"
    apk add --no-cache tzdata > /dev/null
    cp /usr/share/zoneinfo/Europe/Paris /etc/localtime
    echo "Europe/Paris" > /etc/timezone
    apk del tzdata
    echo "Timezone is now set to $(cat /etc/timezone)"
    date
fi

npm install -g npm
npm install --force --build-from-source

npm run test:unit
UNIT_TESTS_EXIT_CODE=$?

if [ $UNIT_TESTS_EXIT_CODE -eq 0 ]
then
  echo -e "\e[32mUnit tests passed !!!\e[0m"
else
  echo ''
  echo ''
  echo -e "\e[31Functional tests failed...\e[0m"
  echo ''
  echo ''
fi

echo ""

echo "Unit testing done, starting the server now to perform functional tests"

npm run test:functional
FUNC_TESTS_EXIT_CODE=$? # store the tests exit code

if [ $FUNC_TESTS_EXIT_CODE -eq 0 ]
then
  echo ''
  echo ''
  echo -e "\e[32mFunctional tests passed !\e[0m"
  echo -e "\e[32mAll tests passed !!!\e[0m"
  echo ''
  echo ''

  npm run coverage-combine

  exit 0
else
  echo ''
  echo ''
  echo -e "\e[31Functional tests failed...\e[0m"
  echo ''
  echo ''

  exit $FUNC_TESTS_EXIT_CODE
fi