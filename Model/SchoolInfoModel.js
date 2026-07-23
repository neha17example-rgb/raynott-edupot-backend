// Model/SchoolInfoModel.js
const { admin } = require('../Config/firebaseAdmin');

class SchoolInfoModel {
  static SCHOOL_INFO_REF = 'schoolInfo';
  
  /**
   * Get school information
   */
  static async getSchoolInfo(schoolId) {
    try {
      if (!schoolId) {
        throw new Error('School ID is required');
      }
      
      const snapshot = await admin.database()
        .ref(`${this.SCHOOL_INFO_REF}/${schoolId}`)
        .once('value');
      
      const data = snapshot.val();
      
      if (!data) {
        return {
          schoolName: '',
          schoolAddress: '',
          schoolAffiliation: '',
          schoolEmail: '',
          schoolPhone: '',
          updatedAt: null
        };
      }
      
      return {
        schoolName: data.schoolName || '',
        schoolAddress: data.schoolAddress || '',
        schoolAffiliation: data.schoolAffiliation || '',
        schoolEmail: data.schoolEmail || '',
        schoolPhone: data.schoolPhone || '',
        updatedAt: data.updatedAt || null
      };
    } catch (error) {
      console.error('❌ Get School Info Error:', error);
      throw error;
    }
  }
  
  /**
   * Save school information - FIXED to preserve email
   */
  // Model/SchoolInfoModel.js
static async saveSchoolInfo(schoolId, schoolData) {
  try {
    if (!schoolId) throw new Error('School ID is required');

    console.log('📥 Saving school info for:', schoolId);
    console.log('📥 Raw data received:', JSON.stringify(schoolData, null, 2));

    // Get existing data to preserve any fields not sent
    const existing = await this.getSchoolInfo(schoolId);

    const completeData = {
      schoolName: schoolData.schoolName?.trim() || existing.schoolName || '',
      schoolAddress: schoolData.schoolAddress?.trim() || existing.schoolAddress || '',
      schoolAffiliation: schoolData.schoolAffiliation?.trim() || existing.schoolAffiliation || '',
      schoolEmail: schoolData.schoolEmail?.trim() || existing.schoolEmail || '',
      schoolPhone: schoolData.schoolPhone?.trim() || existing.schoolPhone || '',
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    console.log('📤 Final data being saved:', JSON.stringify(completeData, null, 2));

    // Use set() to fully replace with clean data
    await admin.database()
      .ref(`${this.SCHOOL_INFO_REF}/${schoolId}`)
      .set(completeData);

    // Verify
    const verified = await this.getSchoolInfo(schoolId);
    console.log('✅ Verified saved data:', JSON.stringify(verified, null, 2));

    return verified;
  } catch (error) {
    console.error('❌ Save School Info Error:', error);
    throw error;
  }
}
  
  /**
   * Update specific fields of school information
   */
  static async updateSchoolInfo(schoolId, updates) {
    try {
      if (!schoolId) {
        throw new Error('School ID is required');
      }
      
      console.log('📝 Updating school info for:', schoolId);
      console.log('📝 Updates:', JSON.stringify(updates, null, 2));
      
      // Get existing data first
      const existingData = await this.getSchoolInfo(schoolId);
      
      // Merge updates with existing data
      const completeData = {
        ...existingData,
        ...updates,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };
      
      // Remove null/undefined values
      Object.keys(completeData).forEach(key => {
        if (completeData[key] === null || completeData[key] === undefined) {
          delete completeData[key];
        }
      });
      
      console.log('📤 Complete data after update:', JSON.stringify(completeData, null, 2));
      
      // Use set() with complete data
      await admin.database()
        .ref(`${this.SCHOOL_INFO_REF}/${schoolId}`)
        .set(completeData);
      
      // Get updated data
      const verifiedData = await this.getSchoolInfo(schoolId);
      
      console.log('✅ School info updated successfully');
      console.log('📧 Updated email:', verifiedData.schoolEmail);
      console.log('📱 Updated phone:', verifiedData.schoolPhone);
      
      return verifiedData;
    } catch (error) {
      console.error('❌ Update School Info Error:', error);
      throw error;
    }
  }
  
  /**
   * Delete school information
   */
  static async deleteSchoolInfo(schoolId) {
    try {
      if (!schoolId) {
        throw new Error('School ID is required');
      }
      
      await admin.database()
        .ref(`${this.SCHOOL_INFO_REF}/${schoolId}`)
        .remove();
      
      console.log(`🗑️ School info deleted for school: ${schoolId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Delete School Info Error:', error);
      throw error;
    }
  }
  
  /**
   * Check if school info exists
   */
  static async schoolInfoExists(schoolId) {
    try {
      if (!schoolId) {
        return false;
      }
      
      const snapshot = await admin.database()
        .ref(`${this.SCHOOL_INFO_REF}/${schoolId}`)
        .once('value');
      
      return snapshot.exists();
    } catch (error) {
      console.error('❌ Check School Info Exists Error:', error);
      return false;
    }
  }
}

module.exports = SchoolInfoModel;