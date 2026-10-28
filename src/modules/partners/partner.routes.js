const express = require('express');
const router = express.Router();
const { getPartners, createPartner, updatePartner, deletePartner, sendInvitation, getPartnerInvitations } = require('./partner.controller');
const verifyToken = require('../../middlewares/auth.middleware');
const jwt = require('jsonwebtoken');

const authOrGuest = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_cdgs');
      req.user = decoded;
    } catch (err) {}
  }
  next();
};

// Endpoints Mitra DUDI & PTN
router.get('/', verifyToken, getPartners);
router.post('/', verifyToken, createPartner);
router.put('/:id', verifyToken, updatePartner);
router.delete('/:id', verifyToken, deletePartner);

// Endpoints Undangan Magang (Find Talent)
router.post('/invite', authOrGuest, sendInvitation);
router.get('/invitations', authOrGuest, getPartnerInvitations);

module.exports = router;