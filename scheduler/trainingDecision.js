const { IST_TIMEZONE } = require('./istSlot');

/**
 * @param {Date} utcInstant
 * @param {string} tz
 * @returns {string} YYYY-MM-DD
 */
function calendarYmdInTz(utcInstant, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utcInstant);
}

/**
 * @param {string} ymd YYYY-MM-DD (civil date)
 * @returns {string} previous civil day YYYY-MM-DD
 */
function previousCalendarDayYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const y2 = dt.getUTCFullYear();
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d2 = String(dt.getUTCDate()).padStart(2, '0');
  return `${y2}-${m2}-${d2}`;
}

/**
 * Normalize `last_workout_date` to YYYY-MM-DD in IST for comparison.
 * @param {unknown} lastWorkout
 * @param {string} tz
 * @returns {string | null}
 */
function userWorkoutYmd(lastWorkout, tz) {
  if (lastWorkout == null || lastWorkout === '') {
    return null;
  }

  if (typeof lastWorkout === 'string') {
    const dateOnly = lastWorkout.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return dateOnly;
    }
  }

  const d = new Date(lastWorkout);
  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return calendarYmdInTz(d, tz);
}

/**
 * @typedef {'sleep_based' | 'fatigue_based' | 'recovery_based' | 'full_training'} DecisionType
 * @typedef {{ message: string, decision_type: DecisionType }} TrainingDecision
 */

/**
 * Uses `last_workout_date`, `fatigue_level` (1–5), `sleep_hours`.
 * Priority: sleep → fatigue → yesterday workout → default.
 *
 * @param {Record<string, unknown>} user
 * @param {Date} [now=new Date()]
 * @returns {TrainingDecision}
 */
function decideTrainingMessage(user, now = new Date()) {
  const sleepRaw = user.sleep_hours;
  const fatigueRaw = user.fatigue_level;

  const sleep_hours =
    sleepRaw === null || sleepRaw === undefined || sleepRaw === ''
      ? NaN
      : Number(sleepRaw);
  const fatigue_level =
    fatigueRaw === null || fatigueRaw === undefined || fatigueRaw === ''
      ? NaN
      : Number(fatigueRaw);

  if (Number.isFinite(sleep_hours) && sleep_hours < 6) {
    return {
      message:
        "You're short on sleep — keep today light: easy mobility or skill work, not a hard session.",
      decision_type: 'sleep_based',
    };
  }

  if (Number.isFinite(fatigue_level) && fatigue_level >= 4) {
    return {
      message:
        'Fatigue is running high — prioritize recovery today: walk, stretch, sleep, and light movement.',
      decision_type: 'fatigue_based',
    };
  }

  const todayIst = calendarYmdInTz(now, IST_TIMEZONE);
  const yesterdayIst = previousCalendarDayYmd(todayIst);
  const workoutYmd = userWorkoutYmd(user.last_workout_date, IST_TIMEZONE);

  if (workoutYmd !== null && workoutYmd === yesterdayIst) {
    return {
      message:
        'You trained yesterday — today is a good day for recovery or focused skill work instead of max effort.',
      decision_type: 'recovery_based',
    };
  }

  return {
    message:
        "You're in a solid window for training — aim for a full session, push quality reps, and fuel well.",
    decision_type: 'full_training',
  };
}

module.exports = {
  decideTrainingMessage,
};
