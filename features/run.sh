#!/usr/bin/env bash

cd /var/app/

echo 'Starting the server in testing mode... (please wait)'

## Starts the server silently
nyc --temp-directory ./.nyc_output.func --report-dir coverage.functional --reporter=text-summary --reporter=lcov ./bin/startServerInTestingMode &>/dev/null &
## Starts the server verbosely for testing
##nyc --temp-directory ./.nyc_output.func --report-dir coverage.functional --reporter=text-summary --reporter=lcov ./bin/startServerInTestingMode &

## Awaiting for the server to be started
printf "Awaiting to connect to the testing server"

ATTEMPTSr=0
MAX_ATTEMPTS=60

until $(curl --output /dev/null --silent --head --fail http://localhost:8843); do
    if [ ${ATTEMPTSr} -eq ${MAX_ATTEMPTS} ];then
        echo '';
        echo 'Too much retries, giving up...'
        exit 1
    fi

    printf '.'
    ATTEMPTSr=$((ATTEMPTSr+1))
    sleep 1
done
echo '';

echo 'The server is started: launch tests !'

./node_modules/.bin/cucumber-js --fail-fast --format progress-bar --publish
TESTS_EXIT_CODE=$? # store the tests exit code

echo 'Tests are done : shutting down the server'

## kill the server via SIGINT
kill -2 `cat /var/run/yggdrasilTestingServer.pid`

## remove the created pid file
rm /var/run/yggdrasilTestingServer.pid

## exits with the tests exit code to reflect the success or failing of those tests
exit $TESTS_EXIT_CODE