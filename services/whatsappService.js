const { getTwilioClient, getTwilioWhatsAppFrom } = require('../config/twilio');

/**
 * Normalize recipient to Twilio WhatsApp address: whatsapp:+E164...
 * @param {string} to
 * @returns {string}
 */
function formatWhatsAppTo(to) {
  if (to == null || typeof to !== 'string') {
    throw new Error('sendWhatsAppMessage: to must be a non-empty string');
  }

  const trimmed = to.trim();
  if (!trimmed) {
    throw new Error('sendWhatsAppMessage: to must be a non-empty string');
  }

  if (/^whatsapp:/i.test(trimmed)) {
    const rest = trimmed.replace(/^whatsapp:/i, '').trim();
    const digits = rest.replace(/\D/g, '');
    if (!digits) {
      throw new Error('sendWhatsAppMessage: to has no dialable digits');
    }
    if (digits.length < 10) {
      throw new Error(
        'sendWhatsAppMessage: number too short after normalizing. Use full E.164.',
      );
    }
    return `whatsapp:+${digits}`;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    throw new Error('sendWhatsAppMessage: to has no dialable digits');
  }
  if (digits.length < 10) {
    throw new Error(
      'sendWhatsAppMessage: number too short. Use full E.164 (e.g. +919629071076).',
    );
  }

  return `whatsapp:+${digits}`;
}

/**
 * @typedef {{ success: true, messageSid: string, status?: string }} WhatsAppSendSuccess
 * @typedef {{ success: false, error: string, code?: string | number }} WhatsAppSendFailure
 * @typedef {WhatsAppSendSuccess | WhatsAppSendFailure} WhatsAppSendResult
 */

/**
 * @param {string} to
 * @param {string} message
 * @returns {Promise<WhatsAppSendResult>}
 */
async function sendWhatsAppMessage(to, message) {
  if (message == null || typeof message !== 'string' || !message.trim()) {
    return {
      success: false,
      error: 'sendWhatsAppMessage: message must be a non-empty string',
    };
  }

  let toAddr;
  try {
    toAddr = formatWhatsAppTo(to);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const from = getTwilioWhatsAppFrom();

  try {
    const client = getTwilioClient();
    const created = await client.messages.create({
      from,
      to: toAddr,
      body: message.trim(),
    });

    return {
      success: true,
      messageSid: created.sid,
      status: created.status,
    };
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const messageText =
      err instanceof Error ? err.message : String(err ?? 'Unknown error');

    return {
      success: false,
      error: messageText,
      ...(code !== undefined ? { code } : {}),
    };
  }
}

module.exports = {
  sendWhatsAppMessage,
};
