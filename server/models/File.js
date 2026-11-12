const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    storedName: { type: String, required: true },
    path: { type: String, required: true },
    uploadedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    // Change required to false so Admins can upload Guidelines/Templates without a project
    projectId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Project', 
      required: false, 
      default: null 
    },
    size: { type: Number },
    type: { type: String },
    category: { 
      type: String, 
      enum: ['Guidelines', 'Templates', 'Submissions'], 
      default: 'Guidelines' 
    },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('File', fileSchema);