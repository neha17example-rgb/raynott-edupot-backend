// controllers/SchoolInfoController.js
const SchoolInfoModel = require('../Model/SchoolInfoModel');

class SchoolInfoController {
  
  /**
   * Get school information
   * GET /api/school-info
   */
  static async getSchoolInfo(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ 
          success: false, 
          error: 'School ID not found' 
        });
      }
      
      console.log(`🔍 Fetching school info for: ${schoolId}`);
      
      const schoolInfo = await SchoolInfoModel.getSchoolInfo(schoolId);
      
      console.log('📤 Returning school info:', JSON.stringify(schoolInfo, null, 2));
      
      res.json({ 
        success: true, 
        data: schoolInfo 
      });
    } catch (error) {
      console.error('❌ Get School Info Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to get school information'
      });
    }
  }
  
  /**
   * Save school information - FIXED
   * POST /api/school-info
   */
  // controllers/SchoolInfoController.js
static async saveSchoolInfo(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ success: false, error: 'School ID not found' });

    const { schoolName, schoolAddress, schoolAffiliation, schoolEmail, schoolPhone } = req.body;

    const schoolData = {
      schoolName: schoolName?.trim() || '',
      schoolAddress: schoolAddress?.trim() || '',
      schoolAffiliation: schoolAffiliation?.trim() || '',
      schoolEmail: schoolEmail?.trim() || '',
      schoolPhone: schoolPhone?.trim() || ''
    };

    console.log('📝 Controller received:', schoolData);

    const savedData = await SchoolInfoModel.saveSchoolInfo(schoolId, schoolData);

    res.json({ 
      success: true, 
      data: savedData,
      message: 'School information saved successfully' 
    });
  } catch (error) {
    console.error('❌ Controller Save Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
  
  /**
   * Update specific fields of school information
   * PATCH /api/school-info
   */
  static async updateSchoolInfo(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ 
          success: false, 
          error: 'School ID not found' 
        });
      }
      
      console.log('📝 Update request body:', JSON.stringify(req.body, null, 2));
      
      const updates = req.body;
      
      // Remove updatedAt if present (we'll set it automatically)
      delete updates.updatedAt;
      
      const updatedData = await SchoolInfoModel.updateSchoolInfo(schoolId, updates);
      
      console.log('✅ School info updated successfully');
      
      res.json({ 
        success: true, 
        data: updatedData,
        message: 'School information updated successfully'
      });
    } catch (error) {
      console.error('❌ Update School Info Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to update school information'
      });
    }
  }
  
  /**
   * Delete school information
   * DELETE /api/school-info
   */
  static async deleteSchoolInfo(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ 
          success: false, 
          error: 'School ID not found' 
        });
      }
      
      await SchoolInfoModel.deleteSchoolInfo(schoolId);
      
      res.json({ 
        success: true, 
        message: 'School information deleted successfully' 
      });
    } catch (error) {
      console.error('❌ Delete School Info Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to delete school information'
      });
    }
  }
  
  /**
   * Check if school info exists
   * GET /api/school-info/exists
   */
  static async schoolInfoExists(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ 
          success: false, 
          error: 'School ID not found' 
        });
      }
      
      const exists = await SchoolInfoModel.schoolInfoExists(schoolId);
      
      res.json({ 
        success: true, 
        exists 
      });
    } catch (error) {
      console.error('❌ School Info Exists Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to check school information'
      });
    }
  }
}

module.exports = SchoolInfoController;