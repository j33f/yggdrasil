FROM j33f/node-docker-container
LABEL maintainer="J33f <jeff@modulaweb.fr>"

EXPOSE 8842

COPY ./ /var/app
COPY ./docker-compose/config/pm2-prod.json /var/pm2Config/config.json
COPY ./docker-compose/scripts/run-prod.sh /var/startScripts/runCustom.sh
RUN rm -r /var/app/docker-compose

VOLUME /var/app
VOLUME /var/pm2Config
VOLUME /var/startScripts

RUN chmod +x /var/startScripts/runCustom.sh

WORKDIR /var/app
RUN npm install --production

CMD /var/startScripts/runCustom.sh