'use strict';

const
  puppeteer = require('puppeteer-core');

class Puppeteer {
  constructor(yggdrasil, withProxy = false) {

    this.browser = null;
    this.yggdrasil = yggdrasil;

    this.options = {
      headless: true,
      executablePath: process.env.CHROME_BIN || '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage']
    };

    if (withProxy) {
      return yggdrasil.proxy.getProxyChainUrl()
        .then(url => {
          this.options.args.push('--proxy-server=' + url);
          yggdrasil.logger.info('Puppeteer will be launched with options', this.options);
        });
    }
    yggdrasil.logger.info('Puppeteer will be launched with options', this.options);
  }

  async getBrowser() {
    this.browser = await puppeteer.launch(this.options);
    return this.browser;
  }
}

module.exports = Puppeteer;