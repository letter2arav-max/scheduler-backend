const { getSupabaseClient } = require('../config/supabase');

const USERS_TABLE = 'users';

const PHONE_KEYS = [
  'whatsapp_phone',
  'whatsapp',
  'phone',
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
 * Match a user row using Twilio WhatsApp `From` (e.g. whatsapp:+15551234567).
 * Compares normalized digit strings to phone fields on the user.
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

  const users = await getAllUsers();

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

module.exports = {
  getAllUsers,
  getUserById,
  findUserByTwilioFrom,
};
