// Middleware/AuthMiddle.js
const AuthModel = require('../Model/AuthModel');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  const result = await AuthModel.verifyIdToken(idToken);

  if (!result.success) {
    return res.status(401).json({
      success: false,
      error: result.error,
      message: result.message || 'Authentication failed',
    });
  }

  req.user = result; 
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'admin_required',
      message: 'Admin privileges required',
    });
  }
  next();
};

// Single middleware for all school access (both school_admin and school_user)
const requireSchoolAccess = (req, res, next) => {
  console.log('requireSchoolAccess - User:', {
    uid: req.user?.uid,
    role: req.user?.role,
    schoolId: req.user?.schoolId
  });
  
  // Allow if user has schoolId and role is either school_admin OR school_user
  if (req.user?.schoolId && (req.user?.role === 'school_admin' || req.user?.role === 'school_user')) {
    return next();
  }
  
  return res.status(403).json({ 
    success: false,
    error: 'school_access_required',
    message: 'School access required' 
  });
};

module.exports = { requireAuth, requireAdmin, requireSchoolAccess };