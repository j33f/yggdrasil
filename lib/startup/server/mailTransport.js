'use strict';

const nodemailer = require('nodemailer');

/**
 * Set the default mail transport service
 * @param yggdrasil
 * @returns {Promise<void>}
 */
module.exports = async (yggdrasil) => {
  yggdrasil.mailTransporter = nodemailer.createTransport(yggdrasil.config.sendmail);
  yggdrasil.mailTransporter.verify(err => {
    if (err) {
      yggdrasil.logger.error('❗Cannot connect to sendmail server. Not a big deal anyway', err);
    } else {
      yggdrasil.logger.info('⚙  Sendmail server reached');
    }
    yggdrasil.fire('startup/core/sendmail');
  });
};