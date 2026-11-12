const mongoose = require('mongoose');

const deadlineSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    audience: { type: String, default: 'All Students' },
    dueDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['upcoming', 'overdue', 'completed'], 
      default: 'upcoming' 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deadline', deadlineSchema);