const twilio = require('twilio');
const logger = require('../utils/logger');

const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

async function sendSMS({ to, body, from }) {
  try {
    if (!client) {
      logger.info(`SMS (mock): to=${to}, body=${body}`);
      return { success: true, mock: true };
    }

    const message = await client.messages.create({
      body,
      to,
      from: from || process.env.TWILIO_PHONE_NUMBER
    });

    logger.info(`SMS sent to ${to}, sid=${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    logger.error(`Failed to send SMS to ${to}:`, error);
    throw error;
  }
}

async function sendBulkSMS({ recipients, body }) {
  const results = await Promise.allSettled(
    recipients.map(recipient => sendSMS({ to: recipient, body }))
  );

  return results.map((result, index) => ({
    recipient: recipients[index],
    success: result.status === 'fulfilled',
    ...(result.status === 'fulfilled' ? result.value : { error: result.reason.message })
  }));
}

module.exports = { sendSMS, sendBulkSMS };