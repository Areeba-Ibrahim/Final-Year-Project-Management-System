const Project = require('../models/Project');
const User = require('../models/User');

// 1. Student submits a proposal (Optionally includes preferred supervisorId)
exports.submitProposal = async (req, res) => {
  try {
    const studentId = req.user._id || req.user.userId || req.user.id;

    // Rule: Check if student has an existing proposal that is NOT rejected
    const existingProject = await Project.findOne({
      studentId,
      status: { $ne: 'rejected' }
    });

    if (existingProject) {
      return res.status(400).json({
        message: 'You already have an active or pending project proposal.'
      });
    }

    const newProject = await Project.create({
      title: req.body.title,
      description: req.body.description,
      studentId,
      supervisorId: req.body.supervisorId || null
    });

    res.status(201).json({
      message: 'Proposal submitted successfully',
      project: newProject
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get logged-in student's own project (For Student Dashboard)
exports.getMyProject = async (req, res) => {
  try {
    const studentId = req.user._id || req.user.userId || req.user.id;
    const project = await Project.findOne({ studentId })
      .sort({ createdAt: -1 })
      .populate('supervisorId', 'name email dept expertise');

    res.status(200).json(project || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Get all projects (For Admin & Teacher Dashboards)
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('studentId', 'name email dept')
      .populate('supervisorId', 'name email dept')
      .sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Update project details / assign supervisor (Used by AdminAssignments.jsx)
exports.updateProject = async (req, res) => {
  try {
    const { title, description, supervisorId, status } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (supervisorId !== undefined) project.supervisorId = supervisorId || null;
    if (status !== undefined) project.status = status;

    const updatedProject = await project.save();

    // Keep Student's User.supervisorId synchronized with Project.supervisorId
    if (supervisorId !== undefined && project.studentId) {
      await User.findByIdAndUpdate(project.studentId, {
        supervisorId: supervisorId || null
      });
    }

    await updatedProject.populate('studentId', 'name email dept');
    await updatedProject.populate('supervisorId', 'name email dept');

    res.status(200).json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Approve a project proposal (Admin or Teacher)
exports.approveProposal = async (req, res) => {
  try {
    const updateFields = { status: 'approved' };
    if (req.body.supervisorId) {
      updateFields.supervisorId = req.body.supervisorId;
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.supervisorId && project.studentId) {
      await User.findByIdAndUpdate(project.studentId, {
        supervisorId: project.supervisorId
      });
    }

    res.status(200).json({ message: 'Proposal approved successfully', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 6. Reject a project proposal (Admin or Teacher)
exports.rejectProposal = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );

    if (!project) return res.status(404).json({ message: 'Project not found' });

    res.status(200).json({ message: 'Proposal rejected', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};