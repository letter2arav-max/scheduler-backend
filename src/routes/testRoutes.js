const express = require('express');

const { sendWhatsAppMessage } = require('../../services');

const router = express.Router();

/**
 * GET /test-whatsapp — send a one-off WhatsApp via Twilio (for manual checks).
 */
router.get('/test-whatsapp', async (req, res) => {
  console.log('[test-whatsapp] route hit');

  const to = process.env.TEST_WHATSAPP_TO?.trim();
  if (!to) {
    console.error(
      '[test-whatsapp] TEST_WHATSAPP_TO is missing; set it in .env (quoted E.164, e.g. TEST_WHATSAPP_TO="+919629071076")',
    );
    return res.status(400).json({
      status: 'error',
      error:
        'TEST_WHATSAPP_TO is not set. Add it to your .env with the full number in quotes.',
    });
  }

  const digitsOnly = to.replace(/\D/g, '');
  console.log(
    '[test-whatsapp] TEST_WHATSAPP_TO raw length:',
    to.length,
    'digits:',
    digitsOnly.length,
    '(preview:',
    to.slice(0, 4) + '…' + to.slice(-4),
    ')',
  );

  const body =
    process.env.TEST_WHATSAPP_MESSAGE?.trim() ||
    'Test message from scheduler backend.';

  try {
    const result = await sendWhatsAppMessage(to, body);

    if (!result.success) {
      console.error(
        '[test-whatsapp] send failed:',
        result.error,
        result.code != null ? `code=${result.code}` : '',
      );
      return res.status(500).json({
        status: 'error',
        error: result.error,
        ...(result.code != null ? { code: result.code } : {}),
      });
    }

    console.log('[test-whatsapp] message sent, sid:', result.messageSid);
    return res.json({ status: 'message sent' });
  } catch (err) {
    console.error('[test-whatsapp] unexpected error:', err);
    return res.status(500).json({
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

module.exports = router;
