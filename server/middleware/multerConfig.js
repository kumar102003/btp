// server/middleware/multerConfig.js

const multer = require('multer');
const path = require('path');

// Storage engine to save PDFs in the /uploads folder with a unique name
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Filter to accept only PDF files
const fileFilter = (req, file, cb) => {
  const fileTypes = /pdf/;
  const isValid = fileTypes.test(path.extname(file.originalname).toLowerCase());
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Optional: 5MB limit
  },
});

module.exports = upload;
