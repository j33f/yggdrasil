const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
require('should-sinon');

let controller = rewire('./mailController');

let fakeBasicYggdrasil = {
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
    sendMail: sinon.stub().resolves()
  },
  get: sinon.stub().returns('production')
};

controller.mailjet = {
  sendMail: sinon.stub().resolves()
};

describe('Mail controller', () => {
  afterEach(() => {
    fakeBasicYggdrasil.mailTransporter.sendMail.resetHistory();
    sinon.reset();
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
    let fakeIcal = {};
    beforeEach(() => {
      fakeIcal = {
        createIcsFileBuilder: sinon.stub().returns({
          events: [],
          toString: sinon.stub().returns('String')
        }),
        createIcsFileBuilder_error: sinon.stub().returns({
          events: [],
          toString: sinon.stub().returns(new Error('test error'))
        })
      };
    });

    it('the sendSimple method should call the internal mail transporter sendMail method', async () => {
      await controller.sendSimple(
        fakeBasicYggdrasil,
        'Chancelor Palpatine <sheev.palpatine@chancelry.senate.gal>',
        'General Cody <cc-2224@clones.gal>',
        'order 66',
        'Execute order 66 now !'
      );
      should(fakeBasicYggdrasil.mailTransporter.sendMail).be.called();
    });

    it('the sendAppointment method should use the ical lib', async () => {
      controller.__set__('ical.createIcsFileBuilder', fakeIcal.createIcsFileBuilder);

      await controller.sendAppointment(
        fakeBasicYggdrasil,
        {},
        {},
        ['foo'] // must me at least one attendee
      );
      should(fakeIcal.createIcsFileBuilder).be.called();
      should(fakeBasicYggdrasil.mailTransporter.sendMail).be.called();
    });

    it('the sendAppointment method should rejects if the ical lib throws', () => {
      controller.__set__('ical.createIcsFileBuilder', fakeIcal.createIcsFileBuilder_error);

      return controller.sendAppointment(
        fakeBasicYggdrasil,
        {},
        {},
        ['foo'] // must me at least one attendee
      )
        .catch(error => {
          should(error).eql(new Error('Error: test error'));
          should(fakeIcal.createIcsFileBuilder_error).be.called();
          should(fakeBasicYggdrasil.mailTransporter.sendMail).not.be.called();
        });
    });
  });

  describe('#the send method', () => {
    before(() => {
      controller.sendSimple = sinon.stub().resolves();
      controller.sendAppointment = sinon.stub().resolves();
    });

    beforeEach(() => {
      fakeBasicYggdrasil.config.emails.strategy = 'smtp';
      fakeBasicYggdrasil.get = sinon.stub().returns('production');
      controller.mailjet.sendMail.resetHistory();
    });

    it('should send emails with mailjet driver if the config says so', async () => {
      fakeBasicYggdrasil.config.emails.strategy = 'mailjet';
      await controller.send(fakeBasicYggdrasil, {});
      should(controller.mailjet.sendMail).be.called();
    });

    it('should not send emails with mailjet driver if the config says not to do so', async () => {
      await controller.send(fakeBasicYggdrasil, {
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
      should(controller.sendSimple).be.calledWith(fakeBasicYggdrasil, 'from name <from@email>', 'to name <to@email>', 'the subject', 'the body');
    });

    it('should call sendMail with given options when the mode is "raw"', async () => {
      await controller.send(fakeBasicYggdrasil, {foo: 'bar'}, 'raw');
      should(fakeBasicYggdrasil.mailTransporter.sendMail).be.calledWith({foo: 'bar'});
    });

    it('should call sendAppointment with given options when the mode is "raw"', async () => {
      await controller.send(fakeBasicYggdrasil, {appointment: 'foo', organizer: 'bar', attendees: ['baz']}, 'appointment');
      should(controller.sendAppointment).be.calledWith(fakeBasicYggdrasil, 'foo', 'bar', ['baz']);
    });

    it('should send mails to configured tester when env is development', async () => {
      fakeBasicYggdrasil.get = sinon.stub().returns('development');

      await controller.send(fakeBasicYggdrasil, {
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
      should(controller.sendSimple).be.calledWith(fakeBasicYggdrasil, 'from name <from@email>', 'to name <foo@bar>', 'the subject', 'the body');
    });
  });
});