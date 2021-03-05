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

You will need to have Docker and Docker-compose installed and configured.

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

The tests are performed by [mocha](https://mochajs.org), and use [sinon](https://sinonjs.org), [should](https://shouldjs.github.io) and [rewire](https://www.npmjs.com/package/rewire).

### Functional tests only

Just run `npm run test:func`

The functional test coverage details information are located in the coverage.functional dir.

The tests are performed by [cucumber](https://github.com/cucumber/cucumber-js)

You need to perform the tests directly into the /var/yggdrasil directory onto the docker container or just have a started stack (the npm command is smart enough to launch the tests into the container by itself).

### Unit and Functional tests

You first need to have a docker stack running, then use the `npm test` command.

The coverage reporter is [istambujs/nyc](https://github.com/istanbuljs/nyc)

## Features

### Configuration

Yggdrasil uses the [defaultConfig.json](./defaultConfig.json) file as a configuration base.

As Yggdrasil uses the [rc module](https://www.npmjs.com/package/rc), you can also use your very own configuration, via : 

- command line arguments, parsed by minimist (e.g. --foo baz, also nested: --foo.bar=baz)
- environment variables prefixed with ${yggdrasil}_
  - or use "__" to indicate nested properties (e.g. yggdrasil_foo__bar__baz => foo.bar.baz)
- a local .${yggdrasil}rc or the first found looking in ./ ../ ../../ ../../../ etc.
- $HOME/.${yggdrasil}rc
- $HOME/.${yggdrasil}/config
- $HOME/.config/${yggdrasil}
- $HOME/.config/${yggdrasil}/config
- /etc/${yggdrasil}rc
- /etc/${yggdrasil}/config

### OAuth Strategies

The currently supported OAuth strategies are: Google, Facebook, GitHub, Microsoft and Twitter.

See [OAuth Strategies Readme](./lib/businessObjects/repositories/AuthRepository/OAuthStrategies) for further details.

### HTTP & SocketIO

Yggdrasil serves HTTP routes via the good old [Express](https://www.npmjs.com/package/express) framework along with a
[SocketIO](https://www.npmjs.com/package/socketio-server) server.

Both of them are secured by an authorization system based on [JWT](https://jwt.io/);

By default, all routes ans SocketIO accesses requires the JWT token to be present (and valid) except the ones used to sign-in, re-create a password, or public files

### Data storage

Yggdrasil uses Mongo as primary storage and Redis for cache.
Everything is put in Redis then Mongo so that yggdrasil can absorb a huge amount of calls.

Redis is also used to store user sessions.

### File storage

By default, the local strategy is used, and the files are stored into the container where Yggdrasil lives.
A S3 storage strategy is in development.

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
