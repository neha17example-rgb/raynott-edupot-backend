// src/Controller/SchoolController.js
const SchoolModel = require('../Model/SchoolModel');
const { rtdb } = require('../Config/firebaseAdmin');

class SchoolController {
    
  static async createSchool(req, res) {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await SchoolModel.createSchool({ name, email, password, phone });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  }

  static async getAllSchools(req, res) {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    try {
      const schools = await SchoolModel.listSchools();
      res.json({ success: true, schools });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch schools' });
    }
  }

  static async toggleSchoolStatus(req, res) {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { schoolId } = req.params;
    const { status } = req.body; // "active" | "inactive"

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await SchoolModel.updateSchoolStatus(schoolId, status);
    res.json(result);
  }

  static async resetPassword(req, res) {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { schoolId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password too short' });
    }

    const result = await SchoolModel.resetSchoolPassword(schoolId, newPassword);

    if (result.success) {
      res.json({
        success: true,
        message: 'Password reset successful',
        email: result.email,
        // Do NOT return newPassword in response in production!
        // Show it only once in admin UI modal
      });
    } else {
      res.status(400).json(result);
    }
  }
  static async deleteSchool(req, res) {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { schoolId } = req.params;

    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    const result = await SchoolModel.deleteSchool(schoolId);

    if (result.success) {
      res.json({ success: true, message: 'School and associated account deleted successfully' });
    } else {
      res.status(400).json(result);
    }
  }
  static async createSchoolUser(req, res) {
    try {
      const { schoolId } = req.params;
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'name, email and password are required' });
      }

      const schoolSnap = await rtdb.ref(`schools/${schoolId}`).once('value');
      if (!schoolSnap.exists()) {
        return res.status(404).json({ success: false, error: 'School not found' });
      }

      const userData = { name, email, password, schoolId };
      const result = await SchoolModel.createSchoolUser(userData);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'User created successfully',
          uid: result.uid,
          email: result.email
        });
      } else {
        res.status(400).json(result);
      }
    } catch (err) {
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  // Get All Users of a School
  static async getSchoolUsers(req, res) {
    try {
      const { schoolId } = req.params;
      const result = await SchoolModel.getSchoolUsers(schoolId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
  }

  // Update School User (e.g., change name or fullAccess)
  static async updateSchoolUser(req, res) {
    try {
      const { uid } = req.params;
      const { name, fullAccess } = req.body;

      const result = await SchoolModel.updateSchoolUser(uid, { name, fullAccess });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update user' });
    }
  }

  // Delete School User
  static async deleteSchoolUser(req, res) {
    try {
      const { uid } = req.params;
      const result = await SchoolModel.deleteSchoolUser(uid);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
  }

  // Update Tab Configuration for a School
  static async updateSchoolTabConfig(req, res) {
    try {
      const { schoolId } = req.params;
      const { enabledTabs } = req.body;

      if (!Array.isArray(enabledTabs) || enabledTabs.length === 0) {
        return res.status(400).json({ success: false, error: 'enabledTabs must be a non-empty array' });
      }

      const result = await SchoolModel.updateSchoolTabConfig(schoolId, enabledTabs);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update tab config' });
    }
  }

  // Get Tab Configuration
  static async getSchoolTabConfig(req, res) {
    try {
      const { schoolId } = req.params;
      const config = await SchoolModel.getSchoolTabConfig(schoolId);
      res.json({ success: true, enabledTabs: config.enabledTabs });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch tab config' });
    }
  }
static async resetSchoolUserPassword(req, res) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  
  const { uid } = req.params;
  const { newPassword } = req.body;
  
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password too short' });
  }
  
  try {
    await admin.auth().updateUser(uid, { password: newPassword });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset user password error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
}
static async updateUserTabConfig(req, res) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  
  const { uid } = req.params;
  const { enabledTabs } = req.body;
  
  if (!Array.isArray(enabledTabs)) {
    return res.status(400).json({ error: 'enabledTabs must be an array' });
  }
  
  try {
    const result = await SchoolModel.updateUserTabConfig(uid, enabledTabs);
    if (result.success) {
      res.json({ success: true, message: 'Tab configuration updated' });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (err) {
    console.error('Update user tab config error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}
}

module.exports = SchoolController;