const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Admin', 'Teacher', 'Student', 'admin', 'teacher', 'student'], 
    required: true 
  },
  dept: { type: String, required: true },
  expertise: { type: String, default: null },   // Used for Teachers
  maxStudents: { type: Number, default: 5 },    // Used for Teachers
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);