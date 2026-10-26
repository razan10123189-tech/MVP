const express = require('express');
const router = express.Router();
const guruController = require('./guru.controller');
const jwt = require('jsonwebtoken');

// Middleware untuk memverifikasi token dengan fallback graceful untuk mode role previewer
const authOrGuest = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_cdgs');
      req.user = decoded;
    } catch (err) {
      // Token tidak valid/kedaluwarsa, lanjut tanpa req.user
    }
  }
  next();
};

// 1. Statistik Dashboard Guru
router.get('/stats', authOrGuest, guruController.getGuruStats);

// 2. Antrean Validasi Portofolio
router.get('/portfolios', authOrGuest, guruController.getPortfoliosQueue);
router.post('/portfolios/:id/approve', authOrGuest, guruController.approvePortfolio);
router.post('/portfolios/:id/revise', authOrGuest, guruController.revisePortfolio);

// 3. Siswa Bimbingan
router.get('/students', authOrGuest, guruController.getMentoredStudents);
router.post('/students', authOrGuest, guruController.addMentoredStudent);
router.patch('/students/:id/recommend', authOrGuest, guruController.toggleRecommendation);

// 4. Monitoring PKL / Magang
router.get('/pkl', authOrGuest, guruController.getPKLPlacements);
router.post('/pkl', authOrGuest, guruController.createPKLPlacement);
router.patch('/pkl/:id/evaluate', authOrGuest, guruController.evaluatePKLPlacement);

// 5. Jurnal & Catatan Bimbingan
router.get('/bimbingan', authOrGuest, guruController.getGuidanceSessions);
router.post('/bimbingan', authOrGuest, guruController.createGuidanceSession);
router.delete('/bimbingan/:id', authOrGuest, guruController.deleteGuidanceSession);

// 6. Laporan Rekapitulasi Guru
router.get('/report', authOrGuest, guruController.getGuruReport);

module.exports = router;
