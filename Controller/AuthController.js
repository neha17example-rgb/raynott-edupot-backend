const AuthModel = require('../Model/AuthModel');

class AuthController {
// In AuthController.js
static async login(req, res) {
  if (!req.user) {
    return res.status(500).json({ success: false, error: 'User not attached' });
  }

  try {
    const profile = await AuthModel.getUserProfile(req.user.uid);

    const userData = {
      uid: req.user.uid,
      email: req.user.email,
      name: profile.name || req.user.name,
      isAdmin: req.user.isAdmin,
      schoolId: req.user.schoolId || null,
      role: req.user.role || 'user',
      fullAccess: req.user.fullAccess || profile.fullAccess || false,  // ← Use from token or profile
        enabledTabs: req.user.enabledTabs || profile.enabledTabs || [],  
      picture: profile.picture || req.user.picture,
    };

    return res.json({
      success: true,
      user: userData,
    });
  } catch (err) {
    console.error('Login response error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}}

module.exports = AuthController;