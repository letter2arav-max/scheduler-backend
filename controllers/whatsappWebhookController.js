const userService = require('../services/userService');
const schedulerLogService = require('../services/schedulerLogService');

const STATUS_DONE = 'DONE';
const STATUS_SKIPPED = 'SKIPPED';

/**
 * Twilio inbound WhatsApp (form body: Body, From).
 * @type {import('express').RequestHandler}
 */
async function postWhatsappWebhook(req, res) {
  try {
    const rawBody = req.body?.Body;
    const from = req.body?.From;

    const body =
      typeof rawBody === 'string' ? rawBody.trim().toLowerCase() : '';

    if (!from || typeof from !== 'string') {
      res.status(200).send();
      return;
    }

    const user = await userService.findUserByTwilioFrom(from);
    if (!user || user.id == null) {
      res.status(200).send();
      return;
    }

    if (body !== 'done' && body !== 'skip') {
      res.status(200).send();
      return;
    }

    const userId = String(user.id);
    const latest = await schedulerLogService.getLatestLogByUserId(userId);

    if (!latest || latest.id == null) {
      res.status(200).send();
      return;
    }

    const nextStatus = body === 'done' ? STATUS_DONE : STATUS_SKIPPED;
    await schedulerLogService.updateLogStatus(String(latest.id), nextStatus);

    res.status(200).send();
  } catch (err) {
    console.error('[webhook/whatsapp]', err.message);
    res.status(200).send();
  }
}

module.exports = {
  postWhatsappWebhook,
};
