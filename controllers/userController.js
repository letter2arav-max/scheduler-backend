const userService = require('../services/userService');

/**
 * POST /user/sleep — update users.sleep_hours
 * @type {import('express').RequestHandler}
 */
async function postUserSleep(req, res) {
  const { user_id: userId, sleep_hours: sleepHoursRaw } = req.body ?? {};

  if (userId == null || userId === '') {
    res.status(400).json({
      success: false,
      error: 'user_id is required',
    });
    return;
  }

  const userIdStr = String(userId).trim();
  if (!userIdStr) {
    res.status(400).json({
      success: false,
      error: 'user_id is required',
    });
    return;
  }

  const sleepHours = Number(sleepHoursRaw);
  if (!Number.isFinite(sleepHours) || sleepHours < 0) {
    res.status(400).json({
      success: false,
      error: 'sleep_hours must be a non-negative number',
    });
    return;
  }

  try {
    await userService.updateSleepHours(userIdStr, sleepHours);
    res.json({ success: true });
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    if (code === 'NOT_FOUND') {
      res.status(404).json({
        success: false,
        error: err instanceof Error ? err.message : 'User not found',
      });
      return;
    }
    console.error('[user/sleep]', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Update failed',
    });
  }
}

module.exports = {
  postUserSleep,
};
