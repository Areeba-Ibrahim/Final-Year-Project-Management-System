const Request = require('../models/Request');
const Project = require('../models/Project');
const User = require('../models/User');

// 1. Get available teachers for student supervisor selection
exports.getAvailableTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'Teacher' }).select('name email dept expertise maxStudents');
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Student sends a supervision request
exports.sendRequest = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { teacherId, message } = req.body;

    // Check if student has an approved project
    const project = await Project.findOne({ studentId, status: 'approved' });
    if (!project) {
      return res.status(400).json({ 
        message: 'You can only request a supervisor after your proposal is approved.' 
      });
    }

    // Check if supervisor is already assigned
    if (project.supervisorId) {
      return res.status(400).json({ message: 'A supervisor has already been assigned to your project.' });
    }

    // Check for existing pending request
    const existingRequest = await Request.findOne({ studentId, status: 'pending' });
    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending supervision request.' });
    }

    const request = await Request.create({ studentId, teacherId, message });
    res.status(201).json({ message: 'Supervision request sent successfully', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Teacher accepts or rejects a request
exports.respondToRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body; // action: 'accepted' or 'rejected'
    const teacherId = req.user.userId;

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.teacherId.toString() !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    request.status = action;
    await request.save();

    // If accepted, update the Project supervisorId field
    if (action === 'accepted') {
      await Project.findOneAndUpdate(
        { studentId: request.studentId, status: 'approved' },
        { supervisorId: teacherId }
      );
    }

    res.status(200).json({ message: `Request ${action} successfully`, request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Admin manually assigns a supervisor
exports.adminAssignSupervisor = async (req, res) => {
  try {
    const { projectId, teacherId } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    project.supervisorId = teacherId;
    await project.save();

    res.status(200).json({ message: 'Supervisor assigned successfully by Admin', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};