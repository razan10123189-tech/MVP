const express = require('express');
const router = express.Router();
const muridController = require('./murid.controller');
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
      // Token tidak valid/kedaluwarsa, lanjut tanpa req.user (controller akan fallback ke demo murid)
    }
  }
  next();
};

// 1. Profil & Ringkasan Siswa
router.get('/profile', authOrGuest, muridController.getStudentProfile);
router.put('/profile', authOrGuest, muridController.updateStudentProfile);
router.get('/stats', authOrGuest, muridController.getStudentStats);

// 2. Portofolio Proyek Siswa (CRUD)
router.get('/portfolios', authOrGuest, muridController.getStudentPortfolios);
router.post('/portfolios', authOrGuest, muridController.createStudentPortfolio);
router.put('/portfolios/:id', authOrGuest, muridController.updateStudentPortfolio);
router.delete('/portfolios/:id', authOrGuest, muridController.deleteStudentPortfolio);

// 3. Lencana Keahlian & Skor Kompetensi
router.get('/badges', authOrGuest, muridController.getStudentBadges);

// 4. Penempatan PKL & Jurnal Bimbingan
router.get('/pkl', authOrGuest, muridController.getStudentPKL);
router.get('/bimbingan', authOrGuest, muridController.getStudentGuidance);

// 5. Lowongan Magang Industri & Lamaran
router.get('/vacancies', authOrGuest, muridController.getVacancies);
router.post('/vacancies/:id/apply', authOrGuest, muridController.applyVacancy);
router.post('/apply', authOrGuest, muridController.applyVacancy);

// 6. Cetak CV / Resume Portofolio Digital
router.get('/resume', authOrGuest, muridController.getStudentResume);

// 7. Undangan Magang / Wawancara Masuk dari DUDI
router.get('/invitations', authOrGuest, muridController.getStudentInvitations);
router.put('/invitations/:id/respond', authOrGuest, muridController.respondInvitation);

module.exports = router;
