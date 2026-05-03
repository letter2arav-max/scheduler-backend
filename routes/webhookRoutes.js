const express = require('express');

const whatsappWebhookController = require('../controllers/whatsappWebhookController');

const router = express.Router();

router.use(express.urlencoded({ extended: false }));

router.post('/whatsapp', whatsappWebhookController.postWhatsappWebhook);

module.exports = router;
