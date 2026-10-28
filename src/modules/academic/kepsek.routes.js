/**
 * Kepsek Routes - /api/v1/kepsek
 */
const express = require('express');
const router = express.Router();
const kepsekController = require('./kepsek.controller');

// Statistik ringkasan eksekutif
router.get('/stats', kepsekController.getExecutiveStats);

// Distribusi talenta per jurusan/bidang
router.get('/talent-distribution', kepsekController.getTalentDistribution);

// Siswa berprestasi (top talents)
router.get('/top-talents', kepsekController.getTopTalents);

// Daftar MoU kemitraan
router.get('/mou', kepsekController.getMouList);

// Update MoU partner tertentu
router.put('/mou/:id', kepsekController.updateMou);

// Target KPI mutu sekolah (dengan realisasi)
router.get('/targets', kepsekController.getQualityTargets);

// Update target KPI tertentu
router.put('/targets/:id', kepsekController.updateTarget);

// Ringkasan kinerja guru pembimbing
router.get('/teacher-summary', kepsekController.getTeacherSummary);

// Data laporan eksekutif lengkap
router.get('/report-data', kepsekController.getReportData);

module.exports = router;
