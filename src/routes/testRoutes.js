const express = require('express');

const { sendWhatsAppMessage } = require('../../services');

const router = express.Router();

router.get('/test-whatsapp', async (req, res) => {
  console.log('[test-whatsapp] route hit');

  const to =
    process.env.TEST_WHATSAPP_TO?.trim() ||
    process.env.TEST_WHATSAPP_FALLBACK?.trim();
  if (!to) {
    console.error(
      '[test-whatsapp] Set TEST_WHATSAPP_TO or TEST_WHATSAPP_FALLBACK',
    );
    return res.status(400).json({
      status: 'error',
      error:
        'Set TEST_WHATSAPP_TO (or TEST_WHATSAPP_FALLBACK) in .env, e.g. "+919629071076".',
    });
  }

  const body =
    process.env.TEST_WHATSAPP_MESSAGE?.trim() ||
    'Test message from scheduler backend.';

  try {
    const result = await sendWhatsAppMessage(to, body);

    if (!result.success) {
      console.error('[test-whatsapp] send failed:', result.error, result.code);
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
