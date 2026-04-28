const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const TEMPLATES = {
  welcome: 'd-welcome-template-id',
  'password-reset': 'd-password-reset-template-id',
  'subscription-activated': 'd-subscription-activated-template-id',
  'subscription-canceled': 'd-subscription-canceled-template-id',
  'order-confirmed': 'd-order-confirmed-template-id',
  'order-shipped': 'd-order-shipped-template-id',
  'new-message': 'd-new-message-template-id'
};

async function sendEmail({ to, template, data, subject, text, html }) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      logger.info(`Email (mock): to=${to}, template=${template}, data=`, data);
      return { success: true, mock: true };
    }

    const msg = {
      to,
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      ...(TEMPLATES[template] ? {
        templateId: TEMPLATES[template],
        dynamicTemplateData: data
      } : {
        subject: subject || 'Message from DTC Platform',
        text: text || JSON.stringify(data),
        html: html || `<pre>${JSON.stringify(data, null, 2)}</pre>`
      })
    };

    const [response] = await sgMail.send(msg);
    logger.info(`Email sent to ${to}, template=${template}, statusCode=${response.statusCode}`);
    return { success: true, messageId: response.headers['x-message-id'] };
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}

module.exports = { sendEmail };