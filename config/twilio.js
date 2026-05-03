const twilio = require('twilio');

/** Twilio WhatsApp sandbox sender; override with TWILIO_WHATSAPP_FROM. */
const DEFAULT_WHATSAPP_FROM = 'whatsapp:+14155238886';

/**
 * WhatsApp-enabled `from` address for Twilio messages.
 * @returns {string}
 */
function getTwilioWhatsAppFrom() {
  return process.env.TWILIO_WHATSAPP_FROM?.trim() || DEFAULT_WHATSAPP_FROM;
}

/**
 * @returns {import('twilio').Twilio}
 */
function createTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      'TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set',
    );
  }

  return twilio(accountSid, authToken);
}

let cached;

/**
 * @returns {import('twilio').Twilio}
 */
function getTwilioClient() {
  if (!cached) {
    cached = createTwilioClient();
  }
  return cached;
}

module.exports = {
  createTwilioClient,
  getTwilioClient,
  getTwilioWhatsAppFrom,
  DEFAULT_WHATSAPP_FROM,
};
