const User = require('../models/User');
const Project = require('../models/Project');
const Deadline = require('../models/Deadline');

// 1. Get system-wide dashboard statistics, supervisor chart data, and recent activity
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. User counts (Total Students & Total Teachers)
    const totalStudents = await User.countDocuments({ role: { $regex: /^student$/i } });
    const totalTeachers = await User.countDocuments({ role: { $regex: /^(teacher|instructor)$/i } });

    // 2. Project status counts (Pending Requests, Active Projects, Completed Projects)
    const totalProjects = await Project.countDocuments();
    const pendingProjects = await Project.countDocuments({ status: 'pending' });
    const activeProjects = await Project.countDocuments({ status: 'approved' });
    const rejectedProjects = await Project.countDocuments({ status: 'rejected' });
    const completedProjects = await Project.countDocuments({ status: 'completed' });

    // 3. Project Distribution by Supervisor (Bar Chart Data)
    const supervisorDistribution = await Project.aggregate([
      {
        $match: {
          supervisorId: { $ne: null },
          status: { $in: ['approved', 'completed'] }
        }
      },
      {
        $group: {
          _id: '$supervisorId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'supervisor'
        }
      },
      { $unwind: '$supervisor' },
      {
        $project: {
          _id: 0,
          supervisorId: '$_id',
          name: '$supervisor.name',
          projects: '$count'
        }
      },
      { $sort: { projects: -1 } }
    ]);

    // 4. Recent Activity Feed (Latest project requests & status changes)
    const recentProjects = await Project.find()
      .populate('studentId', 'name')
      .populate('supervisorId', 'name')
      .sort({ updatedAt: -1 })
      .limit(6);

    const recentActivity = recentProjects.map((proj) => {
      const studentName = proj.studentId?.name || 'A student';
      const teacherName = proj.supervisorId?.name || 'a supervisor';

      let message = '';
      let type = 'Request';
      let priority = 'Medium';

      switch (proj.status) {
        case 'pending':
          message = `${studentName} has requested ${teacherName} to be their supervisor.`;
          type = 'Request';
          priority = 'Medium';
          break;
        case 'approved':
          message = `${teacherName} approved ${studentName}'s project (${proj.title}).`;
          type = 'Approved';
          priority = 'Low';
          break;
        case 'completed':
          message = `${studentName}'s project (${proj.title}) was marked completed by ${teacherName}.`;
          type = 'Completed';
          priority = 'Low';
          break;
        case 'rejected':
          message = `${teacherName} declined ${studentName}'s supervision request.`;
          type = 'Declined';
          priority = 'High';
          break;
        default:
          message = `${studentName} updated project "${proj.title}".`;
      }

      return {
        id: proj._id,
        message,
        type,
        priority,
        timestamp: proj.updatedAt
      };
    });

    res.status(200).json({
      users: {
        students: totalStudents,
        teachers: totalTeachers
      },
      projects: {
        total: totalProjects,
        pending: pendingProjects,
        approved: activeProjects, // Maps to "Active Projects" card
        rejected: rejectedProjects,
        completed: completedProjects
      },
      supervisorDistribution,
      recentActivity
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to load dashboard stats: ' + error.message });
  }
};

// 2. Get all registered users (Filterable by role, populates supervisor details)
exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role: { $regex: new RegExp(`^${role}$`, 'i') } } : {};

    const users = await User.find(filter)
      .select('-password')
      .populate('supervisorId', 'name email dept');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Update user info by ID (Teacher / Student details & Supervisor assignment)
exports.updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      dept,
      department,
      expertise,
      maxStudents,
      role,
      supervisorId,
      supervisor
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Assign updated fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (dept || department) user.dept = dept || department;
    if (expertise !== undefined) user.expertise = expertise;
    if (maxStudents !== undefined) user.maxStudents = Number(maxStudents);
    if (role) user.role = role;
    if (supervisorId !== undefined || supervisor !== undefined) {
      user.supervisorId = supervisorId || supervisor || null;
    }

    const updatedUser = await user.save();
    await updatedUser.populate('supervisorId', 'name email dept');

    const result = updatedUser.toObject();
    delete result.password;

    res.status(200).json(result);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(400).json({ message: 'Failed to update user: ' + error.message });
  }
};

// 4. Delete a user by ID
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- DEADLINE CONTROLLERS ---

// 5. Get all deadlines
exports.getDeadlines = async (req, res) => {
  try {
    const deadlines = await Deadline.find().sort({ createdAt: -1 });
    res.status(200).json(deadlines);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deadlines: ' + error.message });
  }
};

// 6. Create a new deadline
exports.createDeadline = async (req, res) => {
  try {
    const { title, description, audience, dueDate, status } = req.body;
    const newDeadline = new Deadline({
      title,
      description,
      audience: audience || 'All Students',
      dueDate,
      status: status || 'upcoming',
    });
    await newDeadline.save();
    res.status(201).json(newDeadline);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create deadline: ' + error.message });
  }
};

// 7. Update a deadline by ID
exports.updateDeadline = async (req, res) => {
  try {
    const updated = await Deadline.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Deadline not found' });

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update deadline: ' + error.message });
  }
};

// 8. Delete a deadline by ID
exports.deleteDeadline = async (req, res) => {
  try {
    const deleted = await Deadline.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Deadline not found' });

    res.status(200).json({ message: 'Deadline deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete deadline: ' + error.message });
  }
};