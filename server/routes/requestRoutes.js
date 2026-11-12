const express = require('express');
const router = express.Router();
const { 
  getAvailableTeachers, 
  sendRequest, 
  respondToRequest, 
  adminAssignSupervisor 
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get available teachers
router.get('/teachers', protect, authorize('Student', 'Admin'), getAvailableTeachers);

// Student sends request
router.post('/send', protect, authorize('Student'), sendRequest);

// Teacher accepts/rejects request
router.put('/respond', protect, authorize('Teacher'), respondToRequest);

// Admin direct assignment
router.put('/admin-assign', protect, authorize('Admin'), adminAssignSupervisor);

module.exports = router;