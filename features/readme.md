# Functional tests

## Abstract

The Functional tests aims to test the exposed routes of any kind. 

The test framework don't know anything about whats inside of the code, 
it only talks to the yggdrasil through the exposed APIs.

The goal of those tests is to know if the yggdrasil do what it is supposed to do, regardless of the implementations or 
environment.

## About the Framework

These tests are using [Cucumber](https://github.com/cucumber/cucumber-js) which consumes [Gherkin](https://cucumber.io/docs/gherkin/) formatted text 
files to perform tests.

Cucumber creates an isolated context for each scenario and allows various hooks to be triggered 
at various points of a scenario.

Each scenario entry is backed by js code known as "step definition". Each step definition can match one or many gherkin 
expressions and retrieve vars from each gherkin expression matching a step.

Cucumber is clever enough to propose usable js steps definition if a gherkin expression do not match any of 
the current steps.

## Who will write the gherkin features files ?

The usage here is to read the user stories or ticket gherkin files written by the PO, then to re-write them here into 
features files. Obviously, tis a developper who will write the gherkin features files found here.

## About this framework implementation here

These functional tests can be launched in any environment : locally, into CI/CD and even in preprod 
or production environment along the normal backend server. The testing server will use the same DB as 
the normal backend, the same code and declare the same APIs.

The tests are launched via the [run.sh](./run.sh) script which launch a new backend server via 
the [startServerInTestingMode](./startServerInTestingMode) executable nodeJS script which aims to start a new backend 
but in testing mode (the repositories' indexes are changed to not contaminate production data and the server is 
configured to use another port), then the tests are launched. When the tests are done, the testing indexes are deleted 
then the testing server is shut down.

Note that this directory have its own [ESlint rules](./.eslintrc)

## Run the tests

:exclamation: The functional tests have to be run into the same container as the usual backend.

1. Start the complete stack via docker-compose or the start script
2. enter the container with `docker exec -ti backend bash` then run the follwing command `npm run functional-testing` 
**OR** 
use the onne liner : `docker exec -ti backend bash -c "cd /var/yggdrasil && npm run functional-testing"`

## Files organisations

Read the [Cucumber documentation](https://github.com/cucumber/cucumber-js/tree/master/docs) for more details.

- The gherkin files used as an entry point for Cucumber are the .feature files.
- The [step-definitions](./step-definitions) directory contains all js files which declare the functions correspondign 
to the gherkin expressions found in .feature files. 
- The [support](./support) directory contains the general supporting files which are used to create the testing context.
  - The [world.js](./support/world.js) file contains the class creating the context known world (in steps definitions, 
  the "World" class is `this`)
  - The [hooks.js](./support/hooks.js) file contains the hooks definitions which can be executed before and after each 
  or all scenatios, or when called into the .feature files gherkin
  - The [fixture](./support/fixtures) directory contains the fixtures to inject into the database 
  (not a part of cucumber)
  - The [api](./support/api) directory contains all the APIs helpers to be used by the steps definitions, available via 
  the World class and the `this` var into the steps definitions. (not a part of cucumber)