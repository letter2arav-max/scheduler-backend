const express = require('express');

const healthController = require('../controllers/healthController');
const webhookRoutes = require('./webhookRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

router.get('/health', healthController.getHealth);

router.use('/user', userRoutes);

router.use('/webhook', webhookRoutes);

module.exports = router;
