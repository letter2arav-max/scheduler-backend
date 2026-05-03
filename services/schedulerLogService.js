const { getSupabaseClient } = require('../config/supabase');

const LOGS_TABLE = 'scheduler_logs';

/**
 * @param {string} user_id
 * @param {string} message
 * @param {string} status
 * @param {Record<string, unknown>} [extra] e.g. { decision_type: 'sleep_based' }
 * @returns {Promise<Record<string, unknown>>}
 */
async function createLog(user_id, message, status, extra = {}) {
  if (!user_id || typeof user_id !== 'string') {
    throw new Error('createLog requires a non-empty string user_id');
  }
  if (message == null || typeof message !== 'string') {
    throw new Error('createLog requires a string message');
  }
  if (!status || typeof status !== 'string') {
    throw new Error('createLog requires a non-empty string status');
  }

  const supabase = getSupabaseClient();

  const row = { user_id, message, status, ...extra };

  const { data, error } = await supabase
    .from(LOGS_TABLE)
    .insert(row)
    .select()
    .single();

  if (error) {
    const err = new Error(`createLog failed: ${error.message}`);
    err.cause = error;
    throw err;
  }

  if (!data) {
    throw new Error('createLog failed: no row returned');
  }

  return data;
}

/**
 * @param {string} id
 * @param {string} status
 * @returns {Promise<Record<string, unknown>>}
 */
async function updateLogStatus(id, status) {
  if (!id || typeof id !== 'string') {
    throw new Error('updateLogStatus requires a non-empty string id');
  }
  if (!status || typeof status !== 'string') {
    throw new Error('updateLogStatus requires a non-empty string status');
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(LOGS_TABLE)
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      const notFound = new Error(`updateLogStatus: no log found for id ${id}`);
      notFound.code = 'NOT_FOUND';
      throw notFound;
    }
    const err = new Error(`updateLogStatus failed: ${error.message}`);
    err.cause = error;
    throw err;
  }

  return data;
}

/**
 * Most recent log for a user (by created_at, then id).
 * @param {string} user_id
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function getLatestLogByUserId(user_id) {
  if (!user_id || typeof user_id !== 'string') {
    throw new Error('getLatestLogByUserId requires a non-empty string user_id');
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(LOGS_TABLE)
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const err = new Error(`getLatestLogByUserId failed: ${error.message}`);
    err.cause = error;
    throw err;
  }

  return data;
}

/**
 * Latest row with status `sent` (outbound nudge), for cooldown / dedupe.
 * @param {string} user_id
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function getLatestSentLogByUserId(user_id) {
  if (!user_id || typeof user_id !== 'string') {
    throw new Error('getLatestSentLogByUserId requires a non-empty string user_id');
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(LOGS_TABLE)
    .select('*')
    .eq('user_id', user_id)
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const err = new Error(`getLatestSentLogByUserId failed: ${error.message}`);
    err.cause = error;
    throw err;
  }

  return data;
}

module.exports = {
  createLog,
  updateLogStatus,
  getLatestLogByUserId,
  getLatestSentLogByUserId,
};
