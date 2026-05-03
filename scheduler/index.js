const cron = require('node-cron');

const { userService, schedulerLogService, whatsappService } = require('../services');

/** Every minute (testing). Override with SCHEDULER_CRON. */
const DEFAULT_CRON = '* * * * *';

function getSchedulerTimezone() {
  return (
    process.env.SCHEDULER_TZ?.trim() ||
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}

/**
 * Local hour (0–23) in {@link getSchedulerTimezone}.
 * @param {Date} date
 * @param {string} timeZone IANA zone, e.g. America/Los_Angeles
 * @returns {number}
 */
function getHourInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === 'hour');
  return hourPart ? parseInt(hourPart.value, 10) : date.getHours();
}

/**
 * Message for the current time window, or null if outside scheduled slots.
 * Morning 5–9, afternoon 12–3, night 9–11 (local time).
 * @param {Date} [date=new Date()]
 * @returns {string | null}
 */
function getScheduledMessage(date = new Date()) {
  const hour = getHourInTimezone(date, getSchedulerTimezone());

  if (hour >= 5 && hour < 9) {
    return 'Good morning. Time for training.';
  }
  if (hour >= 12 && hour < 15) {
    return 'Protein check: Have you consumed enough protein today?';
  }
  if (hour >= 21 && hour < 23) {
    return 'Prepare for sleep. Avoid screens.';
  }

  return null;
}

/**
 * Pick a dialable destination for WhatsApp from a user row.
 * @param {Record<string, unknown>} user
 * @returns {string | null}
 */
function getUserWhatsAppTo(user) {
  const keys = [
    'whatsapp_phone',
    'whatsapp',
    'phone',
    'phone_number',
    'mobile',
  ];
  for (const key of keys) {
    const v = user[key];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return null;
}

/**
 * Fetch all users, send the time-based WhatsApp nudge, and write scheduler_logs.
 * Does nothing outside morning / afternoon / night windows.
 * @returns {Promise<void>}
 */
async function runScheduler() {
  const message = getScheduledMessage();
  if (!message) {
    return;
  }

  let users;
  try {
    users = await userService.getAllUsers();
  } catch (err) {
    console.error('[scheduler] getAllUsers failed:', err.message);
    return;
  }

  for (const user of users) {
    if (user == null || user.id == null) {
      console.warn('[scheduler] skip user row without id');
      continue;
    }

    const userId = String(user.id);
    const to = getUserWhatsAppTo(user);

    if (!to) {
      try {
        await schedulerLogService.createLog(
          userId,
          message,
          'skipped_no_phone',
        );
      } catch (logErr) {
        console.error(
          '[scheduler] createLog (skipped) failed:',
          userId,
          logErr.message,
        );
      }
      continue;
    }

    const result = await whatsappService.sendWhatsAppMessage(to, message);

    const status = result.success ? 'sent' : 'failed';
    const logMessage = result.success
      ? message
      : `${message} | ${result.error}`;

    try {
      await schedulerLogService.createLog(userId, logMessage, status);
    } catch (logErr) {
      console.error(
        '[scheduler] createLog failed:',
        userId,
        logErr.message,
      );
    }
  }
}

let cronTask = null;

/**
 * Start node-cron job (runs {@link runScheduler} on the schedule).
 */
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

  console.log(`[scheduler] cron started: "${expression}"`);
}

module.exports = {
  runScheduler,
  startScheduler,
};
