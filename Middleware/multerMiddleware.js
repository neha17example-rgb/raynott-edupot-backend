// Middleware/multerMiddleware.js
const multer = require('multer');
const path = require('path');

// Configure storage (using memory storage for Firebase)
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
  fileFilter: fileFilter
});

// Single file upload
const uploadSingle = upload.single('photo');

// Multiple files upload (for bulk)
const uploadMultiple = upload.array('photos', 50); // Max 50 files

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  upload
};