/** India Standard Time for slot checks */
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Current hour (0–23) in IST.
 * @param {Date} date
 * @returns {number}
 */
function getHourIST(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === 'hour');
  return hourPart ? parseInt(hourPart.value, 10) : date.getUTCHours();
}

const MESSAGES = {
  morning: 'Good morning. Time for training.',
  afternoon: 'Protein check: Have you had enough protein today?',
  night: 'Prepare for sleep. Avoid screens.',
};

/**
 * @typedef {'morning' | 'afternoon' | 'night'} MessageSlotType
 * @typedef {{ type: MessageSlotType, message: string }} IstMessageSlot
 */

/**
 * Message and slot label for the current IST time, or null outside windows.
 * Morning 5–9, afternoon 12–3, night 9–11 IST.
 * @param {Date} [date=new Date()]
 * @returns {IstMessageSlot | null}
 */
function getIstMessageSlot(date = new Date()) {
  const hour = getHourIST(date);

  if (hour >= 5 && hour < 9) {
    return { type: 'morning', message: MESSAGES.morning };
  }
  if (hour >= 12 && hour < 15) {
    return { type: 'afternoon', message: MESSAGES.afternoon };
  }
  if (hour >= 21 && hour < 23) {
    return { type: 'night', message: MESSAGES.night };
  }

  return null;
}

module.exports = {
  IST_TIMEZONE,
  getHourIST,
  getIstMessageSlot,
};
