const express = require('express');

const healthController = require('../controllers/healthController');
const webhookRoutes = require('./webhookRoutes');

const router = express.Router();

router.get('/health', healthController.getHealth);

router.use('/webhook', webhookRoutes);

module.exports = router;
