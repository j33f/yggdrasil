'use strict';

const
  url = require('url'),
  HttpsProxyAgent = require('https-proxy-agent'),
  HttpProxyAgent = require('http-proxy-agent'),
  proxyChain = require('proxy-chain'),
  rp = require('request-promise'),
  Bluebird = require('bluebird');

class ProxyMesh {
  constructor(yggdrasil) {
    this.yggdrasil = yggdrasil;
    this.config = yggdrasil.config.proxyMesh;
    this.username = this.config.username;
    this.password = this.config.password;
    this.entryPoints = this.config.entryPoints;
    this.retries = {};
  }

  /**
   * Get a ProxymeshEntryPoint by using the suggested one if it exists in conf or choose one randomly)
   * @param suggestedEntryPoint
   * @returns {*}
   */
  getEntryPoint (suggestedEntryPoint = null) {
    let entryPoint;
    if (suggestedEntryPoint === null) {
      entryPoint = this.entryPoints[Math.floor(Math.random() * this.entryPoints.length)].split(':');
    } else if (this.entryPoints.contains(suggestedEntryPoint)) {
      entryPoint = suggestedEntryPoint;
    }
    return Bluebird.resolve({
      host: entryPoint[0],
      port: entryPoint[1]
    });
  }

  /**
   * Find which agent to use (http or https one ?) depending on the uri
   * @param uri<string> - the target uri
   * @param options<object> - the options to pass to the agent
   * @returns {*}
   */
  getAgent(uri, options) {
    if (url.parse(uri).protocol === 'https:') {
      return new HttpsProxyAgent(options);
    }
    return new HttpProxyAgent(options);
  }

  /**
   * Performs a get request using the ProxyMesh proxy
   * @param uri<string> - the uri to target
   * @param json<boolean> - do we stand by a json response ?
   * @param suggestedEntryPoint<string> - a specific ProxyMesh entryp  oint to use
   * @returns {*}
   */
  get(uri, json = true, suggestedEntryPoint = null) {
    return this.getEntryPoint(suggestedEntryPoint)
      .then(entryPoint => {
        //console.time('proxyMesh get ' + entryPoint.host + ' ' + uri);
        return rp({
          uri: uri,
          json: json,
          timeout: 10000,
          followRedirect: true,
          agent: this.getAgent(uri, {
            host: entryPoint.host,
            port: entryPoint.port,
            auth: [this.username, this.password].join(':')
          })
        })
          .then(result => {
            //console.timeEnd('proxyMesh get ' + entryPoint.host + ' ' + uri);
            if (this.retries[uri]) {
              delete this.retries[uri];
            }
            return Bluebird.resolve(result);
          })
          .catch(e => {
            if (!e.statusCode) {
              console.log(e);
            }
            const minDelay = this.config.retryDelay || 800;
            const maxRetries = this.config.maxRetries || 5;
            let delay = minDelay;

            this.retries[uri] = this.retries[uri] || 0;

            if (this.retries[uri] < maxRetries) {
              this.retries[uri]++;

              delay = Math.floor(Math.random() * (Math.floor(minDelay*2.5) - minDelay)) + minDelay;

              this.yggdrasil.logger.info('[Proxymesh] Request failed due to status code', e.statusCode, 'Retry #'+this.retries[uri], 'in', delay, 'ms for', uri);

              return Bluebird
                .delay(delay)
                .then(() => this.get(uri, json, suggestedEntryPoint));
            }
            // cannot retry anymore
            return Bluebird.reject(e);
          });
      });
  }

  /**
   * Create a proxyChain Url usable with Puppeteer
   * @param suggestedEntryPoint
   * @returns {Promise<*|If>}
   */
  async getProxyChainUrl(suggestedEntryPoint = null) {
    const entryPoint = await this.getEntryPoint(suggestedEntryPoint);
    const proxyRawUrl = 'https://' + this.username + ':' + this.password + '@' + entryPoint.host + ':' + entryPoint.port;
    return proxyChain.anonymizeProxy(proxyRawUrl);
  }
}

module.exports = ProxyMesh;