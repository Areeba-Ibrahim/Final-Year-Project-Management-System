const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getAllFiles,
  uploadFile,
  downloadFile,
  deleteFile,
  getProjectFiles,
  giveFeedback,
  getProjectFeedback,
  markProjectComplete
} = require('../controllers/fileController');

// Get all files (Accessible by logged-in users)
router.get('/', protect, getAllFiles);

// File upload (Accessible by Students, Admins, and Teachers)
router.post('/upload', protect, authorize('Student', 'student', 'Admin', 'admin', 'Teacher', 'teacher'), upload.single('file'), uploadFile);

// Download file
router.get('/download/:fileId', protect, downloadFile);

// Delete file (Admin authorization)
router.delete('/:fileId', protect, authorize('Admin', 'admin'), deleteFile);

// Project files
router.get('/project/:projectId', protect, getProjectFiles);

// Feedback routes
router.post('/feedback', protect, authorize('Teacher', 'teacher'), giveFeedback);
router.get('/feedback/:projectId', protect, getProjectFeedback);

// Mark completed
router.put('/complete/:projectId', protect, authorize('Teacher', 'teacher'), markProjectComplete);

module.exports = router;