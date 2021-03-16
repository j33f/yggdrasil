'use strict';

const
  Bluebird = require('bluebird'),
  { formatPhone } = require('../utils/format');

let mj = {};

mj.sendMail = (from, to, subject, data, templateId, config) => {
  const mailjet = require ('node-mailjet').connect(config.mailjet.api.mail.public, config.mailjet.api.mail.private);

  const options = {
    Messages: [
      {
        From: {
          Email: from.email,
          Name: from.name
        },
        To: [
          {
            Email: to.email,
            Name: to.name
          }
        ],
        TemplateID: templateId,
        TemplateLanguage: true,
        Subject: subject,
        Variables: data
      }
    ]
  };

  return mailjet
    .post('send', {'version': 'v3.1'})
    .request(options);
};

mj.sendSMS = (_to, text, config) => {
  const mailjet = require('node-mailjet').connect(config.mailjet.api.sms.token, {
    version: 'v4'
  });

  const to = formatPhone(_to);
  if (to === null) {
    return Bluebird.reject(new Error(_to + ' is not a right phone number.'));
  }

  const options = {
    Text: text,
    To: to,
    From: config.sms.defaultFrom
  };

  return mailjet
    .post('sms-send')
    .request(options);

};

module.exports = mj;