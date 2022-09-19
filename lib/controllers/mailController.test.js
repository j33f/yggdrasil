const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
require('should-sinon');

const sandbox = sinon.createSandbox();

let controller, yggdrasil, fakeIcal;

describe('Mail controller', () => {
  beforeEach(() => {
    controller = rewire('./mailController');

    yggdrasil = {
      config: {
        emails: {
          testModeEmail: 'foo@bar',
          strategy: 'smtp'
        },
        sendmail: {
          name: '',
          timezone: '',
          tzid: ''
        }
      },
      mailTransporter: {
        sendMail: sandbox.stub().resolves()
      },
      get: sandbox.stub().returns('production')
    };

    controller.mailjet = {
      sendMail: sandbox.stub().resolves()
    };

    fakeIcal = {};
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#topology', () => {
    const properties = [
      'sendSimple',
      'sendAppointment',
      'send'
    ];

    properties.forEach(property => {
      it(`should have the ${property} method`, () => {
        should(controller).have.ownProperty(property);
      });
    });
  });

  describe('#send emails via SMTP server', () => {
    beforeEach(() => {
      fakeIcal = {
        createIcsFileBuilder: sandbox.stub().returns({
          events: [],
          toString: sandbox.stub().returns('String')
        }),
        createIcsFileBuilder_error: sandbox.stub().returns({
          events: [],
          toString: sandbox.stub().returns(new Error('test error'))
        })
      };
    });

    it('the sendSimple method should call the internal mail transporter sendMail method', async () => {
      await controller.sendSimple(
        yggdrasil,
        'Chancelor Palpatine <sheev.palpatine@chancelry.senate.gal>',
        'General Cody <cc-2224@clones.gal>',
        'order 66',
        'Execute order 66 now !'
      );
      should(yggdrasil.mailTransporter.sendMail).be.called();
    });

    it('the sendAppointment method should use the ical lib', async () => {
      controller.__set__('ical.createIcsFileBuilder', fakeIcal.createIcsFileBuilder);

      await controller.sendAppointment(
        yggdrasil,
        {},
        {},
        ['foo'] // must me at least one attendee
      );
      should(fakeIcal.createIcsFileBuilder).be.called();
      should(yggdrasil.mailTransporter.sendMail).be.called();
    });

    it('the sendAppointment method should rejects if the ical lib throws', () => {
      controller.__set__('ical.createIcsFileBuilder', fakeIcal.createIcsFileBuilder_error);

      return controller.sendAppointment(
        yggdrasil,
        {},
        {},
        ['foo'] // must me at least one attendee
      )
        .catch(error => {
          should(error).eql(new Error('Error: test error'));
          should(fakeIcal.createIcsFileBuilder_error).be.called();
          should(yggdrasil.mailTransporter.sendMail).not.be.called();
        });
    });
  });

  describe('#the send method', () => {
    beforeEach(() => {
      yggdrasil.config.emails.strategy = 'smtp';
      yggdrasil.get = sandbox.stub().returns('production');
      controller.sendSimple = sandbox.stub().resolves();
      controller.sendAppointment = sandbox.stub().resolves();
    });

    it('should send emails with mailjet driver if the config says so', async () => {
      yggdrasil.config.emails.strategy = 'mailjet';
      await controller.send(yggdrasil, {});
      should(controller.mailjet.sendMail).be.called();
    });

    it('should not send emails with mailjet driver if the config says not to do so', async () => {
      await controller.send(yggdrasil, {
        from: {
          name: 'from name',
          email: 'from@email'
        },
        to: {
          name: 'to name',
          email: 'to@email'
        },
        subject: 'the subject',
        body: 'the body'
      });
      should(controller.mailjet.sendMail).not.be.called();
      should(controller.sendSimple).be.calledWith(yggdrasil, 'from name <from@email>', 'to name <to@email>', 'the subject', 'the body');
    });

    it('should call sendMail with given options when the mode is "raw"', async () => {
      await controller.send(yggdrasil, {foo: 'bar'}, 'raw');
      should(yggdrasil.mailTransporter.sendMail).be.calledWith({foo: 'bar'});
    });

    it('should call sendAppointment with given options when the mode is "raw"', async () => {
      await controller.send(yggdrasil, {appointment: 'foo', organizer: 'bar', attendees: ['baz']}, 'appointment');
      should(controller.sendAppointment).be.calledWith(yggdrasil, 'foo', 'bar', ['baz']);
    });

    it('should send mails to configured tester when env is development', async () => {
      yggdrasil.get = sandbox.stub().returns('development');

      await controller.send(yggdrasil, {
        from: {
          name: 'from name',
          email: 'from@email'
        },
        to: {
          name: 'to name',
          email: 'to@email'
        },
        subject: 'the subject',
        body: 'the body'
      });
      should(controller.mailjet.sendMail).not.be.called();
      should(controller.sendSimple).be.calledWith(yggdrasil, 'from name <from@email>', 'to name <foo@bar>', 'the subject', 'the body');
    });
  });
});