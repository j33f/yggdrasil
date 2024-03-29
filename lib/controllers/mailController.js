'use strict';

const Bluebird = require('bluebird');
const {castArray} = require('lodash');
const ical = require('ical-toolkit');

let controller = {};

/**
 * Send a simple text mail
 * @param yggdrasil
 * @param from
 * @param to
 * @param subject
 * @param body
 * @returns {*}
 */
controller.sendSimple = async (yggdrasil, from, to, subject, body) => {
  return yggdrasil.mailTransporter.sendMail({
    from: from,
    to: to,
    replyTo: from,
    subject: subject,
    text: body
  });
};

/**
 * Send an appointment to one or many attendees
 * @param yggdrasil
 * @param appointment
 * @param organizer
 * @param attendees
 * @returns {*}
 */
controller.sendAppointment = async (yggdrasil, appointment, organizer, attendees) => {
  let builder = ical.createIcsFileBuilder(), ics, promises = [];

  builder.calname = yggdrasil.config.sendmail.name;
  builder.timezone = yggdrasil.config.sendmail.timezone;
  builder.tzid = yggdrasil.config.sendmail.tzid;
  builder.method = 'REQUEST';
  builder.events.push({
    start: appointment.start,
    end: appointment.end,
    transp: 'OPAQUE',
    summary: appointment.summary,
    alarms: [15, 10, 5],
    location: appointment.location,
    status: 'NEEDS-ACTION',
    organizer: organizer,
    attendees: castArray(attendees)
  });

  ics = builder.toString();
  if (ics instanceof Error) {
    throw new Error(ics);
  }

  castArray(attendees).forEach(attendee => {
    promises.push(yggdrasil.mailTransporter.sendMail({
      from: organizer.name + ' <' + organizer.email + '>',
      replyTo: organizer.name + ' <' + organizer.email + '>',
      to: attendee.name + ' <' + attendee.email + '>',
      subject: appointment.summary,
      text: appointment.summary + ' à ' + appointment.location + ' de ' + appointment.startReadable + ' à ' + appointment.endReadable,
      icalEvent: {
        filename: 'invite.ics',
        method: 'request',
        content: ics.toString()
      }
    }));
  });
  return Bluebird.all(promises);
};

/**
 * Send an email depending on the prefered strategy or mode
 * When test mode, email is sent to
 * @param yggdrasil
 * @param data{object}
 * @param mode{string}
 * @returns {Promise}
 */
controller.send = (yggdrasil, data, mode = 'simple') => {
  if (yggdrasil.get('env') === 'development') {
    data.to.email = yggdrasil.config.emails.testModeEmail;
  }
  if (yggdrasil.config.emails.strategy === 'mailjet' && mode !== 'appointment') {
    return controller.mailjet.sendMail(data.from, data.to, data.subject, data.data, data.templateId, yggdrasil.config);
  }
  switch (mode) {
    case 'simple':
      return controller.sendSimple(yggdrasil, data.from.name + ' <' + data.from.email + '>', data.to.name + ' <' + data.to.email + '>', data.subject, data.body);
    case 'raw':
      return yggdrasil.mailTransporter.sendMail(data);
    case 'appointment':
      return controller.sendAppointment(yggdrasil, data.appointment, data.organizer, data.attendees);
  }
};

module.exports = controller;