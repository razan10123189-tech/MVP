const express = require('express');
const router = express.Router();

// Import controller
const { createTenant, getAllTenants } = require('./tenant.controller');

// Import middlewares
const verifyToken = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');

// Route POST (Buat Tenant baru)
router.post('/', verifyToken, authorizeRoles('Platform Admin'), createTenant);

// Route GET (Lihat semua Tenant)
router.get('/', verifyToken, authorizeRoles('Platform Admin'), getAllTenants);

module.exports = router;