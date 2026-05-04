// Model/HallTicketModel.js
const { admin, storage } = require('../Config/firebaseAdmin'); // Make sure to import storage

class HallTicketModel {
  static HALL_TICKETS_REF = 'hallTickets';
  
  /**
   * Upload image to Firebase Storage
   */
  static async uploadImage(imageFile, schoolId, studentId) {
    try {
      if (!imageFile || !imageFile.buffer) {
        console.log('No image file provided');
        return null;
      }
      
      console.log(`📸 Uploading hall ticket photo for student ${studentId}`);
      console.log(`File size: ${imageFile.size} bytes, Type: ${imageFile.mimetype}`);
      
      const bucket = storage.bucket(); // This should now work
      const fileName = `halltickets/${schoolId}/${studentId}/${Date.now()}_${imageFile.originalname}`;
      const fileUpload = bucket.file(fileName);
      
      const stream = fileUpload.createWriteStream({
        metadata: { contentType: imageFile.mimetype }
      });
      
      return new Promise((resolve, reject) => {
        stream.on('finish', async () => {
          try {
            // Make file publicly accessible
            await fileUpload.makePublic();
            
            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            console.log(`✅ Photo uploaded: ${publicUrl}`);
            resolve(publicUrl);
          } catch (error) {
            console.error('Error getting public URL:', error);
            reject(error);
          }
        });
        
        stream.on('error', (error) => {
          console.error('Stream error:', error);
          reject(error);
        });
        
        stream.end(imageFile.buffer);
      });
    } catch (error) {
      console.error('❌ Upload error:', error);
      return null;
    }
  }
  
  /**
   * Delete image from Firebase Storage
   */
  static async deleteImage(fileUrl) {
    try {
      if (!fileUrl) return;
      
      const bucket = storage.bucket();
      
      // Extract file path from URL
      // URL format: https://storage.googleapis.com/bucket-name/path/to/file
      const urlParts = fileUrl.split('/');
      const fileName = urlParts.slice(3).join('/');
      
      const file = bucket.file(fileName);
      await file.delete();
      console.log(`🗑️ Deleted image: ${fileName}`);
    } catch (error) {
      console.error(`Failed to delete image:`, error);
    }
  }
  
  /**
   * Save or update hall ticket for a student
   */
  static async saveHallTicket(schoolId, studentId, hallTicketData, imageFile = null) {
    try {
      let imageUrl = hallTicketData.imageUrl || null;
      
      // Upload new image if provided
      if (imageFile && imageFile.buffer) {
        // Delete old image if exists
        if (imageUrl) {
          await this.deleteImage(imageUrl);
        }
        
        imageUrl = await this.uploadImage(imageFile, schoolId, studentId);
      }
      
      // Parse subjects if it's a string (coming from FormData)
      let subjects = hallTicketData.subjects;
      if (typeof subjects === 'string') {
        try {
          subjects = JSON.parse(subjects);
        } catch (e) {
          subjects = subjects ? [subjects] : [];
        }
      }
      if (!subjects || !Array.isArray(subjects)) {
        subjects = [];
      }
      
      // Parse instructions if it's a string
      let instructions = hallTicketData.instructions;
      if (typeof instructions === 'string') {
        try {
          instructions = JSON.parse(instructions);
        } catch (e) {
          instructions = instructions ? [instructions] : [];
        }
      }
      if (!instructions || !Array.isArray(instructions)) {
        instructions = [];
      }
      
      const hallTicketRecord = {
        studentId,
        schoolId,
        hallTicketData: {
          ...hallTicketData,
          subjects,
          instructions,
          imageUrl: imageUrl || hallTicketData.existingImageUrl || null,
        },
        imageUrl: imageUrl || hallTicketData.existingImageUrl || null,
        generatedAt: admin.database.ServerValue.TIMESTAMP,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
        version: hallTicketData.version ? parseInt(hallTicketData.version) + 1 : 1
      };
      
      // Remove old imageUrl from hallTicketData to avoid duplication
      delete hallTicketRecord.hallTicketData.imageUrl;
      delete hallTicketRecord.hallTicketData.existingImageUrl;
      
      const ref = admin.database().ref(`${this.HALL_TICKETS_REF}/${schoolId}/${studentId}`);
      await ref.set(hallTicketRecord);
      
      console.log(`✅ Hall ticket saved for student ${studentId}`);
      
      return { 
        success: true, 
        hallTicket: hallTicketRecord,
        imageUrl: hallTicketRecord.imageUrl
      };
    } catch (error) {
      console.error('💥 Save Hall Ticket Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get hall ticket for a specific student
   */
  static async getHallTicket(schoolId, studentId) {
    try {
      const snapshot = await admin.database().ref(`${this.HALL_TICKETS_REF}/${schoolId}/${studentId}`).once('value');
      const hallTicket = snapshot.val();
      
      if (!hallTicket) {
        return { success: false, error: 'Hall ticket not found' };
      }
      
      return { success: true, hallTicket };
    } catch (error) {
      console.error('Get Hall Ticket Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get all hall tickets for a school
   */
  static async getAllHallTickets(schoolId) {
    try {
      const snapshot = await admin.database().ref(`${this.HALL_TICKETS_REF}/${schoolId}`).once('value');
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const hallTickets = [];
      snapshot.forEach((child) => {
        const ticket = child.val();
        hallTickets.push({
          id: child.key,
          ...ticket
        });
      });
      
      hallTickets.sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0));
      
      console.log(`📋 Retrieved ${hallTickets.length} hall tickets`);
      return hallTickets;
    } catch (error) {
      console.error('Get All Hall Tickets Error:', error);
      throw error;
    }
  }
  
  /**
   * Delete hall ticket and associated photo
   */
  static async deleteHallTicket(schoolId, studentId) {
    try {
      // Get the hall ticket first to get image URL
      const snapshot = await admin.database().ref(`${this.HALL_TICKETS_REF}/${schoolId}/${studentId}`).once('value');
      const hallTicket = snapshot.val();
      
      // Delete image from storage if exists
      if (hallTicket && hallTicket.imageUrl) {
        await this.deleteImage(hallTicket.imageUrl);
      }
      
      // Delete from Realtime Database
      await admin.database().ref(`${this.HALL_TICKETS_REF}/${schoolId}/${studentId}`).remove();
      
      console.log(`🗑️ Hall ticket deleted for student ${studentId}`);
      return { success: true };
    } catch (error) {
      console.error('Delete Hall Ticket Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if hall ticket exists for a student
   */
  static async hallTicketExists(schoolId, studentId) {
    try {
      const snapshot = await admin.database().ref(`${this.HALL_TICKETS_REF}/${schoolId}/${studentId}`).once('value');
      return snapshot.exists();
    } catch (error) {
      console.error('Check Hall Ticket Existence Error:', error);
      return false;
    }
  }
  
  /**
   * Save hall ticket template (default settings)
   */
  static async saveHallTicketTemplate(schoolId, templateData) {
    try {
      const ref = admin.database().ref(`hallTicketTemplates/${schoolId}`);
      
      // Parse subjects and instructions if they're strings
      let subjects = templateData.subjects;
      if (typeof subjects === 'string') {
        try {
          subjects = JSON.parse(subjects);
        } catch (e) {
          subjects = subjects ? [subjects] : [];
        }
      }
      
      let instructions = templateData.instructions;
      if (typeof instructions === 'string') {
        try {
          instructions = JSON.parse(instructions);
        } catch (e) {
          instructions = instructions ? [instructions] : [];
        }
      }
      
      await ref.set({
        ...templateData,
        subjects,
        instructions,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });
      
      console.log(`✅ Hall ticket template saved for school ${schoolId}`);
      return { success: true };
    } catch (error) {
      console.error('Save Hall Ticket Template Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get hall ticket template
   */
  static async getHallTicketTemplate(schoolId) {
    try {
      const snapshot = await admin.database().ref(`hallTicketTemplates/${schoolId}`).once('value');
      const template = snapshot.val();
      
      if (!template) {
        // Return default template
        return {
          schoolName: 'Raynott Edupot',
          schoolAddress: '123 Education Street, Knowledge City',
          schoolAffiliation: 'Affiliated to CBSE',
          examTitle: 'ANNUAL EXAMINATION 2025',
          examType: 'Annual Examination',
          examDate: new Date().toLocaleDateString(),
          examTime: '10:00 AM - 1:00 PM',
          subjects: [
            { name: 'Mathematics', code: '041', date: '', time: '', venue: 'Main Examination Hall' },
            { name: 'Science', code: '086', date: '', time: '', venue: 'Main Examination Hall' },
            { name: 'English', code: '184', date: '', time: '', venue: 'Main Examination Hall' }
          ],
          instructions: [
            'Report at the venue 30 minutes before exam time',
            'Bring your school ID card and hall ticket',
            'No electronic devices allowed in examination hall'
          ],
          studentSignature: "Student's Signature",
          principalSignature: 'Principal',
          principalName: 'Dr. S. Kumar'
        };
      }
      
      return template;
    } catch (error) {
      console.error('Get Hall Ticket Template Error:', error);
      return null;
    }
  }
}

module.exports = HallTicketModel;