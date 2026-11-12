const File = require('../models/File');
const Feedback = require('../models/Feedback');
const Project = require('../models/Project');
const path = require('path');
const fs = require('fs');

// 1. Get all system files (For Admin Dashboard & General Lists)
exports.getAllFiles = async (req, res) => {
  try {
    const files = await File.find()
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });
    res.status(200).json(files);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch files: ' + error.message });
  }
};

// 2. Upload a file (Handles both Student Submissions & Admin Guidelines/Templates)
exports.uploadFile = async (req, res) => {
  try {
    const userId = req.user ? (req.user._id || req.user.userId || req.user.id) : null;
    const userRole = req.user ? (req.user.role || '').toLowerCase() : '';

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const { category, description, projectId: bodyProjectId } = req.body;
    let projectId = bodyProjectId || null;

    // Student specific checks (Only students require an approved project)
    if (userRole === 'student' && !projectId) {
      const project = await Project.findOne({ studentId: userId, status: 'approved' });
      if (!project) {
        return res.status(400).json({ message: 'File upload blocked: Project must be approved' });
      }
      if (!project.supervisorId) {
        return res.status(400).json({ message: 'File upload blocked: Supervisor must be assigned first' });
      }
      projectId = project._id;
    }

    const fileExt = path.extname(req.file.originalname).substring(1).toUpperCase();

    const newFile = await File.create({
      filename: req.file.originalname,
      storedName: req.file.filename,
      path: req.file.path,
      uploadedBy: userId,
      projectId: projectId || null,
      size: req.file.size,
      type: fileExt,
      category: category || (userRole === 'student' ? 'Submissions' : 'Guidelines'),
      description: description || ''
    });

    res.status(201).json({ message: 'File uploaded successfully', file: newFile });
  } catch (error) {
    res.status(400).json({ message: 'File upload failed: ' + error.message });
  }
};

// 3. Download file by ID
exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    const filePath = path.isAbsolute(file.path)
      ? file.path
      : path.join(__dirname, '..', file.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File missing from server storage' });
    }

    res.download(filePath, file.filename);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Delete file by ID (Removes DB record and physical file from disk)
exports.deleteFile = async (req, res) => {
  try {
    const fileId = req.params.fileId || req.params.id;
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    const filePath = path.isAbsolute(file.path)
      ? file.path
      : path.join(__dirname, '..', file.path);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await File.findByIdAndDelete(fileId);
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete file: ' + error.message });
  }
};

// 5. Get files for a specific project
exports.getProjectFiles = async (req, res) => {
  try {
    const files = await File.find({ projectId: req.params.projectId }).populate('uploadedBy', 'name email');
    res.status(200).json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 6. Teacher submits feedback
exports.giveFeedback = async (req, res) => {
  try {
    const { projectId, type, title, message } = req.body;
    const teacherId = req.user ? (req.user._id || req.user.userId || req.user.id) : null;

    const feedback = await Feedback.create({
      projectId,
      teacherId,
      type,
      title,
      message
    });

    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 7. Get feedback for a project
exports.getProjectFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ projectId: req.params.projectId }).populate('teacherId', 'name email');
    const positiveCount = feedbacks.filter(f => f.type === 'positive').length;

    res.status(200).json({ feedbacks, positiveCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 8. Teacher marks project as complete
exports.markProjectComplete = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findByIdAndUpdate(
      projectId,
      { status: 'completed' },
      { new: true }
    );

    if (!project) return res.status(404).json({ message: 'Project not found' });

    res.status(200).json({ message: 'Project marked as complete', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};