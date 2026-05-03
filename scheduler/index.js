const cron = require('node-cron');

const { userService, schedulerLogService, whatsappService } = require('../services');
const { getIstMessageSlot, IST_TIMEZONE } = require('./istSlot');

/** Every minute. Override with SCHEDULER_CRON. */
const DEFAULT_CRON = '* * * * *';

/**
 * @param {unknown} user
 * @returns {string | null}
 */
function getUserPhone(user) {
  if (user == null || typeof user !== 'object') {
    return null;
  }
  const phone = user.phone;
  if (typeof phone === 'string' && phone.trim()) {
    return phone.trim();
  }
  return null;
}

/**
 * Fetch users every tick; for each user, use IST slot, send WhatsApp, log on success.
 * @returns {Promise<void>}
 */
async function runScheduler() {
  let users;
  try {
    users = await userService.getAllUsers();
  } catch (err) {
    console.error('[scheduler] getAllUsers failed:', err.message);
    return;
  }

  const slot = getIstMessageSlot();
  if (!slot) {
    return;
  }

  const { message, type: messageType } = slot;

  for (const user of users) {
    try {
      if (user == null || user.id == null) {
        console.warn('[scheduler] skip row without user id');
        continue;
      }

      const userId = String(user.id);
      const phone = getUserPhone(user);

      if (!phone) {
        console.warn('[scheduler] skip user (no phone)', userId);
        continue;
      }

      console.log(
        '[scheduler] user phone:',
        phone,
        '| IST slot:',
        messageType,
        '| TZ:',
        IST_TIMEZONE,
      );

      const result = await whatsappService.sendWhatsAppMessage(phone, message);

      if (!result.success) {
        console.error(
          '[scheduler] WhatsApp failed',
          userId,
          phone,
          result.error,
        );
        continue;
      }

      try {
        await schedulerLogService.createLog(userId, message, 'sent');
      } catch (logErr) {
        console.error(
          '[scheduler] createLog failed after send:',
          userId,
          logErr.message,
        );
      }
    } catch (err) {
      console.error(
        '[scheduler] per-user error:',
        err instanceof Error ? err.message : err,
      );
    }
  }
}

let cronTask = null;

function startScheduler() {
  if (cronTask) {
    return;
  }

  const expression =
    process.env.SCHEDULER_CRON?.trim() || DEFAULT_CRON;

  const options = {};
  const tz = process.env.SCHEDULER_TZ?.trim();
  if (tz) {
    options.timezone = tz;
  }

  cronTask = cron.schedule(expression, () => {
    void runScheduler().catch((err) => {
      console.error('[scheduler] runScheduler error:', err);
    });
  }, options);

  console.log(
    `[scheduler] cron started: "${expression}" (messages use IST: ${IST_TIMEZONE})`,
  );
}

module.exports = {
  runScheduler,
  startScheduler,
};
