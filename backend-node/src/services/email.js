'use strict';

const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (!transporter && config.smtp.host) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.username, pass: config.smtp.password },
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    if (config.isDev) {
      console.log(`[EMAIL (dev)] To: ${to} | Subject: ${subject}`);
    }
    return;
  }

  await t.sendMail({
    from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
    to, subject, html, text,
  });
}

async function sendVerificationEmail(email, token) {
  const url = `${config.frontendUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify your ESG Engine email address',
    html: `
      <h2>Welcome to ESG Momentum Engine!</h2>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${url}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, ignore this email.</p>
    `,
    text: `Verify your email: ${url}`,
  });
}

async function sendPasswordResetEmail(email, token) {
  const url = `${config.frontendUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Reset your ESG Engine password',
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${url}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't request a reset, ignore this email.</p>
    `,
    text: `Reset your password: ${url}`,
  });
}

async function sendAlertNotificationEmail(email, alert, companyName) {
  await sendEmail({
    to: email,
    subject: `ESG Alert Triggered: ${alert.name}`,
    html: `
      <h2>ESG Alert: ${alert.name}</h2>
      <p>Your alert was triggered for <strong>${companyName || 'a tracked company'}</strong>.</p>
      <p>Trigger: ${alert.triggerType}</p>
      <p><a href="${config.frontendUrl}/dashboard">View Dashboard</a></p>
    `,
    text: `ESG Alert "${alert.name}" triggered for ${companyName || 'a tracked company'}.`,
  });
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendAlertNotificationEmail };
