const express = require('express');
const router = express.Router();
const {
  createSchool,
  getSchools,
  deleteSchool
} = require('../controllers/school.controller');

// Menggunakan '/' karena prefix '/api/v1/schools' sudah ditentukan di app.js
router.post('/', createSchool);
router.get('/', getSchools);
router.delete('/:id', deleteSchool);

module.exports = router;