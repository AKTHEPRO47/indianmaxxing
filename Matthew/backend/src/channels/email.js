'use strict';

const nodemailer = require('nodemailer');
const { config, Channel } = require('../config');
const { composePlainText, composeHtml, subjectFor } = require('../core/composer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.email.user || !config.email.appPassword) {
    throw new Error('Gmail SMTP credentials not configured');
  }
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: config.email.user,
      pass: config.email.appPassword,
    },
  });
  return transporter;
}

async function send(event, recipient) {
  if (!recipient.email) {
    throw new Error('Recipient has no email address');
  }
  const info = await getTransporter().sendMail({
    from: config.email.user,
    to: recipient.email,
    subject: subjectFor(event),
    text: composePlainText(event),
    html: composeHtml(event),
  });
  return { channel: Channel.EMAIL, providerMessageId: info.messageId };
}

module.exports = { send };
