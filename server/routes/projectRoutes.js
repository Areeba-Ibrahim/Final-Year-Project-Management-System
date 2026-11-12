const express = require('express');
const router = express.Router();
const {
  submitProposal,
  getMyProject,
  getAllProjects,
  updateProject,
  approveProposal,
  rejectProposal
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Student routes: Submit & view own proposal
router.post('/submit', protect, authorize('Student', 'student'), submitProposal);
router.get('/my', protect, authorize('Student', 'student'), getMyProject);

// Admin & Teacher routes: Fetch all projects
router.get('/', protect, authorize('Admin', 'admin', 'Teacher', 'teacher'), getAllProjects);

// Admin & Teacher routes: Assign supervisor, update, approve, or reject proposals
router.put('/:id', protect, authorize('Admin', 'admin', 'Teacher', 'teacher'), updateProject);
router.put('/:id/approve', protect, authorize('Admin', 'admin', 'Teacher', 'teacher'), approveProposal);
router.put('/:id/reject', protect, authorize('Admin', 'admin', 'Teacher', 'teacher'), rejectProposal);

module.exports = router;