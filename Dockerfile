FROM j33f/node-docker-container:latest
LABEL maintainer="J33f <jeff@modulaweb.fr>"

VOLUME /etc/timezone

COPY . /var/app
COPY ./docker-compose/config/pm2-dev.json /var/pm2Config/config.json
COPY ./docker-compose/scripts/run-prod.sh /var/startScripts/runCustom.sh

RUN set -x \
    && chmod +x /var/startScripts/run.sh \
    && npm install -g npm \
    && cd /var/app \
    && npm install --force --build-from-source

CMD /var/startScripts/runCustom.sh