const { getSupabaseClient } = require('../config/supabase');
const { IST_TIMEZONE } = require('../scheduler/istSlot');

const USERS_TABLE = 'users';

/**
 * @param {Date} [now]
 * @returns {string} YYYY-MM-DD in IST
 */
function todayIstYmd(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Canonical + legacy columns for matching/sending (same order everywhere).
 * Prefer DB column `phone` (indexed).
 */
const PHONE_KEYS = [
  'phone',
  'whatsapp_phone',
  'whatsapp',
  'phone_number',
  'mobile',
];

/**
 * @param {string} input
 * @returns {string}
 */
function normalizePhoneDigits(input) {
  return String(input)
    .replace(/^whatsapp:/i, '')
    .replace(/\D/g, '');
}

/**
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function getAllUsers() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from(USERS_TABLE).select('*');

  if (error) {
    const err = new Error(`getAllUsers failed: ${error.message}`);
    err.cause = error;
    throw err;
  }

  return data ?? [];
}

/**
 * @param {string} id
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function getUserById(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('getUserById requires a non-empty string id');
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    const err = new Error(`getUserById failed: ${error.message}`);
    err.cause = error;
    throw err;
  }

  return data;
}

/**
 * Indexed lookup on `users.phone`, then legacy multi-column scan (same digit match).
 * @param {string} fromDigits
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function findUserByTwilioFromLegacy(fromDigits) {
  let users;
  try {
    users = await getAllUsers();
  } catch (e) {
    throw e;
  }

  for (const user of users) {
    if (user == null || user.id == null) {
      continue;
    }

    for (const key of PHONE_KEYS) {
      const raw = user[key];
      if (typeof raw !== 'string' || !raw.trim()) {
        continue;
      }
      const userDigits = normalizePhoneDigits(raw);
      if (userDigits && userDigits === fromDigits) {
        return user;
      }
    }
  }

  return null;
}

/**
 * Match Twilio WhatsApp `From` (e.g. whatsapp:+9196…) to a user.
 * @param {string} twilioFrom
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function findUserByTwilioFrom(twilioFrom) {
  if (twilioFrom == null || typeof twilioFrom !== 'string' || !twilioFrom.trim()) {
    return null;
  }

  const fromDigits = normalizePhoneDigits(twilioFrom);
  if (!fromDigits) {
    return null;
  }

  const supabase = getSupabaseClient();
  const variants = [...new Set([`+${fromDigits}`, fromDigits])];

  for (const phone of variants) {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      const err = new Error(`findUserByTwilioFrom failed: ${error.message}`);
      err.cause = error;
      throw err;
    }
    if (data) {
      return data;
    }
  }

  return findUserByTwilioFromLegacy(fromDigits);
}

/**
 * Webhook "done": set last workout to today (IST), fatigue -= 1 (min 1).
 * @param {string} userId
 * @param {Record<string, unknown>} currentUser
 * @returns {Promise<Record<string, unknown>>}
 */
async function applyUserAfterDoneReply(userId, currentUser) {
  const today = todayIstYmd();
  const raw = currentUser.fatigue_level;
  const fatigue = Number(raw);
  const prevFatigue = Number.isFinite(fatigue) ? fatigue : 1;
  const nextFatigue = Math.max(1, prevFatigue - 1);

  console.log(
    '[userService] applyUserAfterDoneReply: preparing update',
    { userId, last_workout_date: today, fatigue_level: `${prevFatigue} -> ${nextFatigue}` },
  );

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({
      last_workout_date: today,
      fatigue_level: nextFatigue,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    const err = new Error(`applyUserAfterDoneReply failed: ${error.message}`);
    err.cause = error;
    throw err;
  }

  console.log('[userService] applyUserAfterDoneReply: users row updated OK', userId);

  return data;
}

/**
 * Webhook "skip": fatigue += 1 (max 5).
 * @param {string} userId
 * @param {Record<string, unknown>} currentUser
 * @returns {Promise<Record<string, unknown>>}
 */
async function applyUserAfterSkipReply(userId, currentUser) {
  const raw = currentUser.fatigue_level;
  const fatigue = Number(raw);
  const prevFatigue = Number.isFinite(fatigue) ? fatigue : 1;
  const nextFatigue = Math.min(5, prevFatigue + 1);

  console.log(
    '[userService] applyUserAfterSkipReply: preparing update',
    { userId, fatigue_level: `${prevFatigue} -> ${nextFatigue}` },
  );

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({
      fatigue_level: nextFatigue,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    const err = new Error(`applyUserAfterSkipReply failed: ${error.message}`);
    err.cause = error;
    throw err;
  }

  console.log('[userService] applyUserAfterSkipReply: users row updated OK', userId);

  return data;
}

/**
 * @param {string} userId
 * @param {number} sleepHours
 * @returns {Promise<Record<string, unknown>>}
 */
async function updateSleepHours(userId, sleepHours) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('updateSleepHours requires a non-empty string userId');
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({ sleep_hours: sleepHours })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      const err = new Error(`updateSleepHours: no user found for id ${userId}`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    const err = new Error(`updateSleepHours failed: ${error.message}`);
    err.cause = error;
    throw err;
  }

  return data;
}

/**
 * Partial update on `users` (validated caller).
 * @param {string} userId
 * @param {Record<string, unknown>} patch
 * @returns {Promise<Record<string, unknown>>}
 */
async function updateUser(userId, patch) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('updateUser requires a non-empty string userId');
  }
  if (patch == null || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('updateUser requires a plain object patch');
  }
  if (Object.keys(patch).length === 0) {
    throw new Error('updateUser patch is empty');
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update(patch)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      const err = new Error(`updateUser: no user found for id ${userId}`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    const err = new Error(`updateUser failed: ${error.message}`);
    err.cause = error;
    throw err;
  }

  return data;
}

module.exports = {
  getAllUsers,
  getUserById,
  findUserByTwilioFrom,
  applyUserAfterDoneReply,
  applyUserAfterSkipReply,
  updateSleepHours,
  updateUser,
};
