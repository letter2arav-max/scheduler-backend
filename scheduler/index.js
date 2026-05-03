const cron = require('node-cron');

const { userService, schedulerLogService, whatsappService } = require('../services');
const { getIstMessageSlot, IST_TIMEZONE } = require('./istSlot');
const { decideTrainingMessage } = require('./trainingDecision');

/** Every minute. Override with SCHEDULER_CRON. */
const DEFAULT_CRON = '* * * * *';

const COOLDOWN_MS =
  Math.max(0, Number(process.env.SCHEDULER_SEND_COOLDOWN_MINUTES) || 180) *
  60 *
  1000;

/**
 * Resolve dialable number (same field order as webhook / userService).
 * @param {unknown} user
 * @returns {string | null}
 */
function getUserPhone(user) {
  if (user == null || typeof user !== 'object') {
    return null;
  }
  const keys = [
    'phone',
    'whatsapp_phone',
    'whatsapp',
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
 * @param {unknown} createdAt
 * @returns {number | null} epoch ms
 */
function parseCreatedAt(createdAt) {
  if (createdAt == null) {
    return null;
  }
  const t = new Date(createdAt).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Fetch users; in IST notify windows, send state-based training message via WhatsApp and log.
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

  if (!Array.isArray(users) || users.length === 0) {
    return;
  }

  if (!getIstMessageSlot()) {
    return;
  }

  const now = new Date();

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

      if (COOLDOWN_MS > 0) {
        try {
          const lastSent =
            await schedulerLogService.getLatestSentLogByUserId(userId);
          const ts = parseCreatedAt(lastSent?.created_at);
          if (ts != null && now.getTime() - ts < COOLDOWN_MS) {
            console.log(
              '[scheduler] skip cooldown user=',
              userId,
              'last_sent_min_ago=',
              Math.round((now.getTime() - ts) / 60000),
            );
            continue;
          }
        } catch (coolErr) {
          console.error(
            '[scheduler] cooldown check failed (continuing):',
            coolErr.message,
          );
        }
      }

      const { message, decision_type: decisionType } = decideTrainingMessage(
        user,
        now,
      );

      console.log('[scheduler] user:', userId, 'phone:', phone);
      console.log(
        '[scheduler] state:',
        {
          sleep_hours: user.sleep_hours,
          fatigue_level: user.fatigue_level,
          last_workout_date: user.last_workout_date,
        },
        '| decision_type:',
        decisionType,
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
        try {
          await schedulerLogService.createLog(
            userId,
            `${message} | ${result.error}`,
            'failed',
            { decision_type: decisionType },
          );
        } catch (logErr) {
          console.error(
            '[scheduler] createLog failed (failed status):',
            userId,
            logErr.message,
          );
        }
        continue;
      }

      try {
        await schedulerLogService.createLog(userId, message, 'sent', {
          decision_type: decisionType,
        });
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
    `[scheduler] cron "${expression}" | IST windows | cooldown ${COOLDOWN_MS / 60000}m | TZ ${IST_TIMEZONE}`,
  );
}

module.exports = {
  runScheduler,
  startScheduler,
};
