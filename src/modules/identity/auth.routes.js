const express = require('express');
const router = express.Router();

// 1. Import fungsi controller dari auth.controller.js
const { registerUser, loginUser, getMe } = require('./auth.controller');

// 2. Import middleware verifikasi dari folder middlewares
const verifyToken = require('../../middlewares/auth.middleware');

// ==========================================
// RUTE PUBLIK (Bisa diakses tanpa token)
// ==========================================
router.post('/register', registerUser);
router.post('/login', loginUser);

// ==========================================
// RUTE TERPROTEKSI (Wajib membawa token JWT)
// ==========================================
// Posisi middleware (verifyToken) diletakkan di tengah-tengah:
// Rute -> Middleware Verifikasi -> Controller Final
router.get('/me', verifyToken, getMe);

module.exports = router;