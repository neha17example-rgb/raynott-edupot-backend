// controllers/HallTicketController.js
const HallTicketModel = require('../Model/HalTicketModel');
const { admin } = require('../Config/firebaseAdmin');

class HallTicketController {
  
  /**
   * Save or update hall ticket for a student
   * POST /api/halltickets/:studentId
   */
  static async saveHallTicket(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      const { studentId } = req.params;
      let hallTicketData = req.body;
      const imageFile = req.file;
      
      console.log(` Saving hall ticket for student ${studentId}`);
      console.log('  School ID:', schoolId);
      console.log('  Has image:', !!imageFile);
      
      // Parse hallTicketData if it's a string (coming from FormData)
      if (typeof hallTicketData.hallTicketData === 'string') {
        try {
          hallTicketData = JSON.parse(hallTicketData.hallTicketData);
        } catch (e) {
          // If parsing fails, use as is
        }
      }
      
      // Parse subjects and instructions if they're strings
      if (hallTicketData.subjects && typeof hallTicketData.subjects === 'string') {
        try {
          hallTicketData.subjects = JSON.parse(hallTicketData.subjects);
        } catch (e) {
          hallTicketData.subjects = hallTicketData.subjects ? [hallTicketData.subjects] : [];
        }
      }
      
      if (hallTicketData.instructions && typeof hallTicketData.instructions === 'string') {
        try {
          hallTicketData.instructions = JSON.parse(hallTicketData.instructions);
        } catch (e) {
          hallTicketData.instructions = hallTicketData.instructions ? [hallTicketData.instructions] : [];
        }
      }
      
      const result = await HallTicketModel.saveHallTicket(schoolId, studentId, hallTicketData, imageFile);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Hall ticket saved successfully',
          hallTicket: result.hallTicket,
          imageUrl: result.imageUrl
        });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('💥 Save Hall Ticket Controller Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
  
  /**
   * Get hall ticket for a specific student
   * GET /api/halltickets/:studentId
   */
  static async getHallTicket(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      const { studentId } = req.params;
      
      const result = await HallTicketModel.getHallTicket(schoolId, studentId);
      
      if (result.success) {
        res.json({ success: true, hallTicket: result.hallTicket });
      } else {
        res.status(404).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Get Hall Ticket Controller Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
  
  /**
   * Get all hall tickets for the school
   * GET /api/halltickets
   */
  static async getAllHallTickets(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      
      const hallTickets = await HallTicketModel.getAllHallTickets(schoolId);
      
      // Optionally populate student details
      const hallTicketsWithStudentInfo = await Promise.all(
        hallTickets.map(async (ticket) => {
          const studentSnapshot = await admin.database()
            .ref(`schools/${schoolId}/students/${ticket.studentId}`)
            .once('value');
          const student = studentSnapshot.val();
          return {
            ...ticket,
            studentInfo: student?.basicInfo || null
          };
        })
      );
      
      res.json({
        success: true,
        hallTickets: hallTicketsWithStudentInfo,
        count: hallTicketsWithStudentInfo.length
      });
    } catch (error) {
      console.error('Get All Hall Tickets Controller Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
  
  /**
   * Delete hall ticket
   * DELETE /api/halltickets/:studentId
   */
  static async deleteHallTicket(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      const { studentId } = req.params;
      
      const result = await HallTicketModel.deleteHallTicket(schoolId, studentId);
      
      if (result.success) {
        res.json({ success: true, message: 'Hall ticket deleted successfully' });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Delete Hall Ticket Controller Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
  
  /**
   * Check if hall ticket exists
   * GET /api/halltickets/:studentId/exists
   */
  static async hallTicketExists(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      const { studentId } = req.params;
      
      const exists = await HallTicketModel.hallTicketExists(schoolId, studentId);
      res.json({ success: true, exists });
    } catch (error) {
      console.error('Hall Ticket Exists Controller Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
  
  /**
   * Get hall tickets by date range
   * GET /api/halltickets/reports/date-range?startDate=...&endDate=...
   */
  static async getHallTicketsByDateRange(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, error: 'Start date and end date required' });
      }
      
      const hallTickets = await HallTicketModel.getHallTicketsByDateRange(schoolId, startDate, endDate);
      res.json({ success: true, hallTickets });
    } catch (error) {
      console.error('Get Hall Tickets By Date Range Controller Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
  
  /**
   * Bulk generate hall tickets
   * POST /api/halltickets/bulk/generate
   */
  static async bulkGenerateHallTickets(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      const { studentIds, templateData } = req.body;
      
      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Student IDs array required' });
      }
      
      // Fetch all students
      const students = [];
      for (const studentId of studentIds) {
        const studentSnapshot = await admin.database()
          .ref(`schools/${schoolId}/students/${studentId}`)
          .once('value');
        const student = studentSnapshot.val();
        if (student) {
          students.push({ studentId, ...student });
        }
      }
      
      const result = await HallTicketModel.bulkGenerateHallTickets(schoolId, students, templateData);
      
      if (result.success) {
        res.json({
          success: true,
          message: `Generated ${result.results.length} hall tickets`,
          results: result.results
        });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Bulk Generate Controller Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
  
  /**
   * Save hall ticket template
   * POST /api/halltickets/template/settings
   */
  static async saveHallTicketTemplate(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      const templateData = req.body;
      
      const result = await HallTicketModel.saveHallTicketTemplate(schoolId, templateData);
      
      if (result.success) {
        res.json({ success: true, message: 'Template saved successfully' });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Save Template Controller Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
  
  /**
   * Get hall ticket template
   * GET /api/halltickets/template/settings
   */
  static async getHallTicketTemplate(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      
      const template = await HallTicketModel.getHallTicketTemplate(schoolId);
      res.json({ success: true, template });
    } catch (error) {
      console.error('Get Template Controller Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
  
  /**
   * Export hall tickets as CSV
   * GET /api/halltickets/export/csv
   */
  static async exportHallTicketsCSV(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      
      const hallTickets = await HallTicketModel.getAllHallTickets(schoolId);
      
      // Format data for CSV
      const csvData = hallTickets.map(ticket => ({
        'Student Name': ticket.hallTicketData?.studentName || '',
        'Admission Number': ticket.hallTicketData?.admissionNumber || '',
        'Class': ticket.hallTicketData?.studentClass || '',
        'Section': ticket.hallTicketData?.section || '',
        'Roll Number': ticket.hallTicketData?.rollNumber || '',
        'Exam Type': ticket.hallTicketData?.examType || '',
        'Exam Date': ticket.hallTicketData?.examDate || '',
        'Generated Date': ticket.generatedAt ? new Date(ticket.generatedAt).toLocaleDateString() : '',
        'Version': ticket.version || 1
      }));
      
      res.json({
        success: true,
        data: csvData,
        count: csvData.length
      });
    } catch (error) {
      console.error('Export CSV Controller Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  /**
   * Get school information for the school
   * GET /api/school-info
   */
  static async getSchoolInfo(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ success: false, error: 'School ID not found' });
      }
      
      console.log(`🔍 Fetching school info for: ${schoolId}`);
      
      const snapshot = await admin.database()
        .ref(`schoolInfo/${schoolId}`)
        .once('value');
      
      const data = snapshot.val();
      console.log('📊 Raw data from Firebase:', JSON.stringify(data, null, 2));
      
      // If no data exists, create default with ALL fields
      if (!data) {
        console.log('⚠️ No school data found, creating default');
        const defaultData = {
          schoolName: '',
          schoolAddress: '',
          schoolAffiliation: '',
          schoolEmail: '',
          schoolPhone: '',
          updatedAt: admin.database.ServerValue.TIMESTAMP
        };
        await admin.database().ref(`schoolInfo/${schoolId}`).set(defaultData);
        return res.json({ success: true, data: defaultData });
      }
      
      // Ensure ALL fields exist
      const schoolData = {
        schoolName: data.schoolName || '',
        schoolAddress: data.schoolAddress || '',
        schoolAffiliation: data.schoolAffiliation || '',
        schoolEmail: data.schoolEmail || '',
        schoolPhone: data.schoolPhone || '',
        updatedAt: data.updatedAt || null
      };
      
      console.log('📤 Returning school data:', JSON.stringify(schoolData, null, 2));
      console.log('📧 Email returned:', schoolData.schoolEmail);
      console.log('📱 Phone returned:', schoolData.schoolPhone);
      
      res.json({ success: true, data: schoolData });
    } catch (error) {
      console.error('❌ Get School Info Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  /**
   * Save school information
   * POST /api/school-info
   */
  static async saveSchoolInfo(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      
      // Log the ENTIRE request body
      console.log('📝 FULL REQUEST BODY:', JSON.stringify(req.body, null, 2));
      console.log('📝 REQUEST BODY KEYS:', Object.keys(req.body));
      console.log('📝 REQUEST BODY TYPE:', typeof req.body);
      
      // Extract fields - handle both JSON and FormData
      let schoolName, schoolAddress, schoolAffiliation, schoolEmail, schoolPhone;
      
      // If the body is already an object with the fields
      if (req.body && typeof req.body === 'object') {
        schoolName = req.body.schoolName;
        schoolAddress = req.body.schoolAddress;
        schoolAffiliation = req.body.schoolAffiliation;
        schoolEmail = req.body.schoolEmail;
        schoolPhone = req.body.schoolPhone;
        
        // Also check if fields are nested (sometimes happens with FormData)
        if (!schoolName && req.body.schoolName !== undefined) schoolName = req.body.schoolName;
        if (!schoolAddress && req.body.schoolAddress !== undefined) schoolAddress = req.body.schoolAddress;
        if (!schoolAffiliation && req.body.schoolAffiliation !== undefined) schoolAffiliation = req.body.schoolAffiliation;
        if (!schoolEmail && req.body.schoolEmail !== undefined) schoolEmail = req.body.schoolEmail;
        if (!schoolPhone && req.body.schoolPhone !== undefined) schoolPhone = req.body.schoolPhone;
      }
      
      console.log(`📝 Saving school info for schoolId: ${schoolId}`);
      console.log('📝 Individual fields:');
      console.log('  - schoolName:', schoolName);
      console.log('  - schoolAddress:', schoolAddress);
      console.log('  - schoolAffiliation:', schoolAffiliation);
      console.log('  - schoolEmail:', schoolEmail);
      console.log('  - schoolPhone:', schoolPhone);
      
      if (!schoolId) {
        return res.status(400).json({ success: false, error: 'School ID not found' });
      }
      
      // CRITICAL: Make sure ALL fields are included
      const schoolData = {
        schoolName: schoolName || '',
        schoolAddress: schoolAddress || '',
        schoolAffiliation: schoolAffiliation || '',
        schoolEmail: schoolEmail || '',
        schoolPhone: schoolPhone || '',
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };
      
      console.log('📤 Data to save:', JSON.stringify(schoolData, null, 2));
      
      // Use set to completely replace the data (ensures all fields are written)
      await admin.database().ref(`schoolInfo/${schoolId}`).set(schoolData);
      
      // Read back to verify
      const verifySnapshot = await admin.database()
        .ref(`schoolInfo/${schoolId}`)
        .once('value');
      const savedData = verifySnapshot.val();
      
      console.log('✅ Verified saved data:', JSON.stringify(savedData, null, 2));
      console.log('📧 Email in saved data:', savedData?.schoolEmail);
      console.log('📱 Phone in saved data:', savedData?.schoolPhone);
      
      // Return the complete data
      res.json({ 
        success: true, 
        data: {
          schoolName: savedData?.schoolName || '',
          schoolAddress: savedData?.schoolAddress || '',
          schoolAffiliation: savedData?.schoolAffiliation || '',
          schoolEmail: savedData?.schoolEmail || '',
          schoolPhone: savedData?.schoolPhone || ''
        }
      });
    } catch (error) {
      console.error('❌ Save School Info Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to save school information'
      });
    }
  }

  /**
   * Save hall ticket settings for a specific class/section
   * POST /api/hallticket-settings/:key
   */
  static async saveHallTicketSettings(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      const { key } = req.params;
      const settingsData = req.body;
      
      if (!schoolId) {
        return res.status(400).json({ success: false, error: 'School ID not found' });
      }
      
      // Validate required fields
      if (!settingsData) {
        return res.status(400).json({ success: false, error: 'Settings data required' });
      }
      
      await admin.database()
        .ref(`hallTicketSettings/${schoolId}/${key}`)
        .set({
          ...settingsData,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        });
      
      res.json({ success: true, data: settingsData });
    } catch (error) {
      console.error('Save Hall Ticket Settings Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  /**
   * Get hall ticket settings for a specific class/section
   * GET /api/hallticket-settings/:key
   */
  static async getHallTicketSettings(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      const { key } = req.params;
      
      if (!schoolId) {
        return res.status(400).json({ success: false, error: 'School ID not found' });
      }
      
      const snapshot = await admin.database()
        .ref(`hallTicketSettings/${schoolId}/${key}`)
        .once('value');
      
      const data = snapshot.val() || {
        examTitle: '',
        examType: '',
        examDate: '',
        examTime: '',
        examDuration: '',
        subjects: [],
        instructions: [],
        studentSignature: "Student's Signature",
        principalSignature: 'Principal',
        principalName: '',
        examController: 'Exam Controller',
        examControllerName: '',
      };
      
      res.json({ success: true, data });
    } catch (error) {
      console.error('Get Hall Ticket Settings Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  /**
   * Get all hall ticket settings for a school
   * GET /api/hallticket-settings
   */
  static async getAllHallTicketSettings(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ success: false, error: 'School ID not found' });
      }
      
      const snapshot = await admin.database()
        .ref(`hallTicketSettings/${schoolId}`)
        .once('value');
      
      const data = snapshot.val() || {};
      
      res.json({ success: true, data });
    } catch (error) {
      console.error('Get All Hall Ticket Settings Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  /**
   * Delete hall ticket settings for a class/section
   * DELETE /api/hallticket-settings/:key
   */
  static async deleteHallTicketSettings(req, res) {
    try {
      const schoolId = req.user?.schoolId;
      const { key } = req.params;
      
      if (!schoolId) {
        return res.status(400).json({ success: false, error: 'School ID not found' });
      }
      
      await admin.database()
        .ref(`hallTicketSettings/${schoolId}/${key}`)
        .remove();
      
      res.json({ success: true, message: 'Settings deleted successfully' });
    } catch (error) {
      console.error('Delete Hall Ticket Settings Error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
}

module.exports = HallTicketController;