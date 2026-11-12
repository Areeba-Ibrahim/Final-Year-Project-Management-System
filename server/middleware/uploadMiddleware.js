const multer = require('multer');
const path = require('path');

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  }
});

// File extension filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /pdf|doc|docx|ppt|pptx|zip|rar|tar/;
  const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  
  if (extName) {
    return cb(null, true);
  }
  cb(new Error('Only PDF, DOC, PPT, ZIP, RAR, and TAR files are allowed.'));
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB file size limit
});

module.exports = upload;