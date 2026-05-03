const userService = require('../services/userService');
const schedulerLogService = require('../services/schedulerLogService');

const STATUS_DONE = 'done';
const STATUS_SKIPPED = 'skipped';

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
      console.log('[webhook/whatsapp] user: not found | from:', from);
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
      console.log('[webhook/whatsapp] user:', {
        id: userId,
        phone: user.phone,
        from,
      });
      console.log('[webhook/whatsapp] response type: no_log_to_update');
      res.status(200).send();
      return;
    }

    const responseType = body === 'done' ? STATUS_DONE : STATUS_SKIPPED;
    const nextStatus = responseType;

    console.log('[webhook/whatsapp] user:', {
      id: userId,
      phone: user.phone,
      from,
    });
    console.log('[webhook/whatsapp] response type:', responseType);

    try {
      console.log(
        '[webhook/whatsapp] updating scheduler_logs id=%s -> status=%s',
        latest.id,
        nextStatus,
      );
      await schedulerLogService.updateLogStatus(String(latest.id), nextStatus);
      console.log('[webhook/whatsapp] scheduler_logs update OK');
    } catch (logErr) {
      console.error(
        '[webhook/whatsapp] scheduler_logs update failed:',
        logErr.message,
      );
      res.status(200).send();
      return;
    }

    try {
      if (body === 'done') {
        await userService.applyUserAfterDoneReply(userId, user);
      } else {
        await userService.applyUserAfterSkipReply(userId, user);
      }
    } catch (userErr) {
      console.error(
        '[webhook/whatsapp] users table update failed:',
        userErr.message,
      );
    }

    res.status(200).send();
  } catch (err) {
    console.error('[webhook/whatsapp]', err.message);
    res.status(200).send();
  }
}

module.exports = {
  postWhatsappWebhook,
};
