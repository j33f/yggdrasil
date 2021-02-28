# Yggdrasil

[![CircleCI](https://img.shields.io/circleci/build/github/j33f/yggdrasil/master)](https://circleci.com/gh/j33f/yggdrasil/tree/master)
[![codecov](https://img.shields.io/codecov/c/github/j33f/yggdrasil?token=JRVW2FHCKL)](https://codecov.io/gh/j33f/yggdrasil)
![Depfu](https://img.shields.io/depfu/j33f/yggdrasil)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=j33f_yggdrasil&metric=alert_status)](https://sonarcloud.io/dashboard?id=j33f_yggdrasil)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=j33f_yggdrasil&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=j33f_yggdrasil)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=j33f_yggdrasil&metric=bugs)](https://sonarcloud.io/dashboard?id=j33f_yggdrasil)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=j33f_yggdrasil&metric=code_smells)](https://sonarcloud.io/dashboard?id=j33f_yggdrasil)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=j33f_yggdrasil&metric=sqale_index)](https://sonarcloud.io/dashboard?id=j33f_yggdrasil)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=j33f_yggdrasil&metric=ncloc)](https://sonarcloud.io/dashboard?id=j33f_yggdrasil)

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=j33f_yggdrasil&metric=security_rating)](https://sonarcloud.io/dashboard?id=j33f_yggdrasil)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=j33f_yggdrasil&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=j33f_yggdrasil)

[![License apache2](https://img.shields.io/github/license/j33f/yggdrasil?label=license)](https://choosealicense.com/licenses/apache-2.0/)

Yggdrasil is a versatile ready to use backend.

Currently, this project is in early alpha, need unit tests, documentation and some refactor.
DO NOT USE AS IS !!!!

## Start in dev  mode : 

```bash
./start-dev
```

This will launch the server stack (redis, mongo, backend) via docker (killing existing containers if needed)

The server is started when you see this : 

```
backend    | time: ⏱  Starting Server took: 747.483ms
backend    | info: 🤘  Yggdrasil is up and running !

```

## Testing

### Unit tests only

Just run `npm run test:unit`

The unit test coverage details information are located in the coverage dir.

The tests are performed by mocha, and use [sinon](https://sinonjs.org), [chai](https://www.chaijs.com) and [should](https://shouldjs.github.io).

### Functional tests only

Just run `npm run test:func`

The functional test coverage details information are located in the coverage.functional dir.

The tests are performed by [cucumber](https://github.com/cucumber/cucumber-js)

You need to perform the tests directly into the /var/yggdrasil directory onto the docker container or just have a started stack (the npm command is smart enough to launch the tests into the container by itself).

### Unit and Functional tests

You first need to have a docker stack running, then use the `npm test` command.

The coverage reporter is [istambujs/nyc](https://github.com/istanbuljs/nyc)

## Mongo Dump/Restore
```bash
./mongoDump

./mongoRestore
```

## Troubleshoot

### I have dirty docker images and volumes

Clean your docker environment :

```bash
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker network prune -f
docker rmi -f $(docker images --filter dangling=true -qa)
docker volume rm $(docker volume ls --filter dangling=true -q)
docker rmi -f $(docker images -qa)
```

### Mongo is in a dirty mess after a system crash

In case of a system crash, some mongoDB data files could be irremediably corrupted. To get a clean stack, just do
* `docker-compose -r docker-compose/dev.yml kill `
* `sudo rm -rf /data/mongo`
* restart the stack
* launch the `./mongoRestore` script
* enjoy your day

## Licence 

Copyright 2020 Jean-François Vial

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
