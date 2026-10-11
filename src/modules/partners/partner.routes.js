const express = require('express');
const router = express.Router();
const { getPartners, createPartner, deletePartner } = require('./partner.controller');
const verifyToken = require('../../middlewares/auth.middleware');

// Proteksi endpoint dengan token autentikasi
console.log('DEBUG HANDLERS:', { getPartners, createPartner, deletePartner, verifyToken });
router.get('/', verifyToken, getPartners);
router.post('/', verifyToken, createPartner);
router.delete('/:id', verifyToken, deletePartner);

module.exports = router;