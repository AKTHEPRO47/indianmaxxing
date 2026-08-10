'use strict';

const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function emailConfigurationError() {
  if (!config.smtp.host) return 'SMTP_HOST is not configured';
  if (Boolean(config.smtp.username) !== Boolean(config.smtp.password)) return 'SMTP credentials are incomplete';
  if (!config.smtp.fromEmail || config.smtp.fromEmail === 'noreply@tricard.local') return 'SMTP_FROM_EMAIL is not configured';
  return null;
}

function getTransporter() {
  if (!transporter && !emailConfigurationError()) {
    const transportOptions = {
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      requireTLS: config.smtp.useTls && config.smtp.port !== 465,
    };
    if (config.smtp.username) {
      transportOptions.auth = { user: config.smtp.username, pass: config.smtp.password };
    }
    transporter = nodemailer.createTransport(transportOptions);
  }
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const configurationError = emailConfigurationError();
  if (configurationError) {
    console.error(`[EMAIL] Not configured: ${configurationError}`);
    return { status: 'not_configured', reason: configurationError };
  }

  const t = getTransporter();
  try {
    const result = await t.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
      to, subject, html, text,
    });
    return { status: 'sent', messageId: result.messageId };
  } catch (error) {
    console.error(`[EMAIL] Delivery failed for "${subject}": ${error.message}`);
    return { status: 'failed', reason: 'delivery_failed' };
  }
}

async function sendVerificationEmail(email, token) {
  const url = `${config.frontendUrl}/#/verify-email?token=${encodeURIComponent(token)}`;
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
  const url = `${config.frontendUrl}/#/reset-password?token=${encodeURIComponent(token)}`;
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
  return sendEmail({
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

function shouldSendAlertEmail(user) {
  if (!user?.email || !user.isActive) return false;
  try {
    const preferences = JSON.parse(user.notificationPreferencesJson || '{}');
    return preferences.emailAlerts !== false && preferences.email_alerts !== false;
  } catch {
    return true;
  }
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendAlertNotificationEmail, shouldSendAlertEmail, emailConfigurationError };
