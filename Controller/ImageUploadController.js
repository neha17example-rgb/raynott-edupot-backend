// Controller/ImageUploadController.js
const { admin, rtdb } = require('../Config/firebaseAdmin');
const bucket = admin.storage().bucket();

class ImageUploadController {
  /**
   * Upload student photo for ID card
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async uploadStudentPhoto(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      const { studentId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ success: false, error: 'Only image files are allowed' });
      }

      // Validate file size (max 5MB)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Image size must be less than 5MB' });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `students/${schoolId}/${studentId}/photo_${timestamp}.jpg`;
      const file = bucket.file(filename);

      // Upload file to Firebase Storage
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
          metadata: {
            studentId: studentId,
            schoolId: schoolId,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      // Make file publicly accessible
      await file.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

      // Update student record with photo URL
      const studentRef = rtdb.ref(`schools/${schoolId}/students/${studentId}`);
      await studentRef.update({
        'basicInfo/photoUrl': publicUrl,
        'basicInfo/photoUpdatedAt': admin.database.ServerValue.TIMESTAMP,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });

      return res.status(200).json({
        success: true,
        message: 'Photo uploaded successfully',
        photoUrl: publicUrl,
        studentId: studentId
      });

    } catch (error) {
      console.error('Upload student photo error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload photo'
      });
    }
  }

  /**
   * Delete student photo
   */
  static async deleteStudentPhoto(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      const { studentId } = req.params;

      // Get student data to find photo URL
      const studentSnapshot = await rtdb.ref(`schools/${schoolId}/students/${studentId}`).once('value');
      const student = studentSnapshot.val();

      if (!student) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      const photoUrl = student.basicInfo?.photoUrl;
      if (photoUrl) {
        // Extract filename from URL
        const filename = photoUrl.split(`${bucket.name}/`)[1];
        if (filename) {
          const file = bucket.file(filename);
          await file.delete().catch(err => {
            console.warn('File deletion warning:', err.message);
          });
        }
      }

      // Remove photo URL from student record
      await rtdb.ref(`schools/${schoolId}/students/${studentId}/basicInfo/photoUrl`).remove();
      await rtdb.ref(`schools/${schoolId}/students/${studentId}/basicInfo/photoUpdatedAt`).remove();

      return res.status(200).json({
        success: true,
        message: 'Photo deleted successfully'
      });

    } catch (error) {
      console.error('Delete student photo error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete photo'
      });
    }
  }

  /**
   * Get student photo URL
   */
  static async getStudentPhoto(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      const { studentId } = req.params;

      const studentSnapshot = await rtdb.ref(`schools/${schoolId}/students/${studentId}`).once('value');
      const student = studentSnapshot.val();

      if (!student) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      const photoUrl = student.basicInfo?.photoUrl || null;

      return res.status(200).json({
        success: true,
        photoUrl: photoUrl,
        studentId: studentId
      });

    } catch (error) {
      console.error('Get student photo error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get photo'
      });
    }
  }

  /**
   * Upload school logo
   */
  static async uploadSchoolLogo(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ success: false, error: 'Only image files are allowed' });
      }

      if (req.file.size > 2 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Logo size must be less than 2MB' });
      }

      const timestamp = Date.now();
      const filename = `schools/${schoolId}/logo_${timestamp}.jpg`;
      const file = bucket.file(filename);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
          metadata: {
            schoolId: schoolId,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

      // Update school info with logo URL
      await rtdb.ref(`schools/${schoolId}/info/logoUrl`).set(publicUrl);

      return res.status(200).json({
        success: true,
        message: 'School logo uploaded successfully',
        logoUrl: publicUrl
      });

    } catch (error) {
      console.error('Upload school logo error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload school logo'
      });
    }
  }

  /**
   * Delete school logo
   */
  static async deleteSchoolLogo(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Get current logo URL
      const infoSnapshot = await rtdb.ref(`schools/${schoolId}/info/logoUrl`).once('value');
      const logoUrl = infoSnapshot.val();

      if (logoUrl) {
        const filename = logoUrl.split(`${bucket.name}/`)[1];
        if (filename) {
          const file = bucket.file(filename);
          await file.delete().catch(err => {
            console.warn('File deletion warning:', err.message);
          });
        }
      }

      await rtdb.ref(`schools/${schoolId}/info/logoUrl`).remove();

      return res.status(200).json({
        success: true,
        message: 'School logo deleted successfully'
      });

    } catch (error) {
      console.error('Delete school logo error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete school logo'
      });
    }
  }

  /**
   * Bulk upload student photos
   */
  static async bulkUploadStudentPhotos(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No image files provided' });
      }

      const results = [];
      const errors = [];

      for (const file of req.files) {
        try {
          // Expect filename to be studentId
          const studentId = file.originalname.split('.')[0];
          
          // Validate student exists
          const studentSnapshot = await rtdb.ref(`schools/${schoolId}/students/${studentId}`).once('value');
          if (!studentSnapshot.exists()) {
            errors.push({ studentId, error: 'Student not found' });
            continue;
          }

          const timestamp = Date.now();
          const filename = `students/${schoolId}/${studentId}/photo_${timestamp}.jpg`;
          const storageFile = bucket.file(filename);

          await storageFile.save(file.buffer, {
            metadata: {
              contentType: file.mimetype,
              metadata: {
                studentId: studentId,
                schoolId: schoolId,
                uploadedAt: new Date().toISOString()
              }
            }
          });

          await storageFile.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

          await rtdb.ref(`schools/${schoolId}/students/${studentId}/basicInfo/photoUrl`).set(publicUrl);
          await rtdb.ref(`schools/${schoolId}/students/${studentId}/basicInfo/photoUpdatedAt`).set(admin.database.ServerValue.TIMESTAMP);

          results.push({ studentId, success: true, photoUrl: publicUrl });

        } catch (err) {
          errors.push({ 
            studentId: file.originalname.split('.')[0], 
            error: err.message 
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: `Uploaded ${results.length} photos, ${errors.length} failed`,
        results: results,
        errors: errors
      });

    } catch (error) {
      console.error('Bulk upload student photos error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload photos'
      });
    }
  }
}

module.exports = ImageUploadController;