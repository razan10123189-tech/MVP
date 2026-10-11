const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('./dashboard.controller');
const verifyToken = require('../../middlewares/auth.middleware');

router.get('/stats', verifyToken, getDashboardStats);

module.exports = router;