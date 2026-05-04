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
}

module.exports = HallTicketController;