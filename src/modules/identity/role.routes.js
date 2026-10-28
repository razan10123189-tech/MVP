const express = require('express');
const router = express.Router();

// Controller
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles
} = require('./role.controller');

// Middlewares
const verifyToken = require('../../middlewares/auth.middleware');
const authorizeRoles = require('../../middlewares/role.middleware');


// RUTE ASSIGN / REMOVE ROLE (harus sebelum /:id agar tidak bentrok)

router.post('/assign', verifyToken, authorizeRoles('Platform Admin', 'Kepala Sekolah'), assignRoleToUser);
router.post('/remove', verifyToken, authorizeRoles('Platform Admin', 'Kepala Sekolah'), removeRoleFromUser);


// RUTE LIHAT ROLES MILIK USER TERTENTU

router.get('/user/:userId', verifyToken, getUserRoles);


// RUTE CRUD ROLES

router.get('/', verifyToken, getAllRoles);
router.post('/', verifyToken, authorizeRoles('Platform Admin', 'Kepala Sekolah'), createRole);
router.get('/:id', verifyToken, getRoleById);
router.put('/:id', verifyToken, authorizeRoles('Platform Admin', 'Kepala Sekolah'), updateRole);
router.delete('/:id', verifyToken, authorizeRoles('Platform Admin'), deleteRole);

module.exports = router;
