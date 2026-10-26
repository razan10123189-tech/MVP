const express = require('express');
const router = express.Router();
const { getPartners, createPartner, updatePartner, deletePartner } = require('./partner.controller');
const verifyToken = require('../../middlewares/auth.middleware');



// Proteksi endpoint dengan token autentikasi
console.log('DEBUG HANDLERS:', { getPartners, createPartner, updatePartner, deletePartner, verifyToken });
router.get('/', verifyToken, getPartners);
router.post('/', verifyToken, createPartner);
router.put('/:id', verifyToken, updatePartner);
router.delete('/:id', verifyToken, deletePartner);


module.exports = router;