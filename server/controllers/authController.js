const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register User
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, dept, expertise, maxStudents } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      dept,
      expertise: role === 'Teacher' ? expertise : null,
      maxStudents: role === 'Teacher' ? maxStudents : null
    });

    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login User with strict Role Verification
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // STRICT ROLE VERIFICATION: Ensure requested role matches database role
    if (role && user.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({
        message: `Access denied. Your account is registered as ${user.role}, not ${role}.`
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      token,
      role: user.role,
      userId: user._id,
      name: user.name,
      email: user.email,
      dept: user.dept
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};