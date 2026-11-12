const express = require('express');
const router = express.Router();
const { 
  getDashboardStats, 
  getAllUsers, 
  updateUser,
  deleteUser,
  getDeadlines,
  createDeadline,
  updateDeadline,
  deleteDeadline
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const adminAuth = [protect, authorize('Admin', 'admin')];

// Dashboard
router.get('/stats', adminAuth, getDashboardStats);

// User Management
router.get('/users', adminAuth, getAllUsers);
router.put('/users/:id', adminAuth, updateUser);
router.delete('/users/:id', adminAuth, deleteUser);

// Deadline Management
router.get('/deadlines', adminAuth, getDeadlines);
router.post('/deadlines', adminAuth, createDeadline);
router.put('/deadlines/:id', adminAuth, updateDeadline);
router.delete('/deadlines/:id', adminAuth, deleteDeadline);

module.exports = router;