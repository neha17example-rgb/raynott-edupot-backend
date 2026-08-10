// controllers/TeacherController.js
const TeacherModel = require('../Model/TeacherModel');

class TeacherController {
  /**
   * Create a new teacher
   * POST /api/teachers
   */
  static async createTeacher(req, res) {
    const schoolId = req.user?.schoolId;
    
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'School access required' });
    }

    const teacherData = req.body;
    
    if (!teacherData.name || !teacherData.subject || !teacherData.classesAssigned || teacherData.classesAssigned.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, subject, and at least one class are required' 
      });
    }

    const result = await TeacherModel.createTeacher(teacherData, schoolId);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  }

  /**
   * Get all teachers
   * GET /api/teachers
   */
  static async getAllTeachers(req, res) {
    const schoolId = req.user?.schoolId;
    
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const teachers = await TeacherModel.getAllTeachers(schoolId);
      
      // Add calculated overall performance for each teacher
      const teachersWithPerformance = teachers.map(teacher => ({
        ...teacher,
        overallPerformancePercentage: TeacherModel.calculateOverallPerformance(teacher)
      }));
      
      res.json({ success: true, teachers: teachersWithPerformance });
    } catch (err) {
      console.error('Get all teachers error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch teachers' });
    }
  }

  /**
   * Get teacher by ID
   * GET /api/teachers/:teacherId
   */
  static async getTeacherById(req, res) {
    const schoolId = req.user?.schoolId;
    
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { teacherId } = req.params;
    
    try {
      const teacher = await TeacherModel.getTeacherById(teacherId);
      
      if (!teacher) {
        return res.status(404).json({ success: false, error: 'Teacher not found' });
      }
      
      // Verify teacher belongs to the school
      if (teacher.schoolId !== schoolId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      
      res.json({ 
        success: true, 
        teacher: {
          ...teacher,
          overallPerformancePercentage: TeacherModel.calculateOverallPerformance(teacher)
        }
      });
    } catch (err) {
      console.error('Get teacher by ID error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch teacher' });
    }
  }

  /**
   * Update teacher
   * PATCH /api/teachers/:teacherId
   */
  static async updateTeacher(req, res) {
    const schoolId = req.user?.schoolId;
    
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { teacherId } = req.params;
    const updates = req.body;
    
    // First verify teacher exists and belongs to school
    const teacher = await TeacherModel.getTeacherById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }
    
    if (teacher.schoolId !== schoolId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = await TeacherModel.updateTeacher(teacherId, updates);
    res.json(result);
  }

  /**
   * Delete teacher
   * DELETE /api/teachers/:teacherId
   */
  static async deleteTeacher(req, res) {
    const schoolId = req.user?.schoolId;
    
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { teacherId } = req.params;
    
    // Verify teacher exists and belongs to school
    const teacher = await TeacherModel.getTeacherById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }
    
    if (teacher.schoolId !== schoolId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = await TeacherModel.deleteTeacher(teacherId);
    res.json(result);
  }

  /**
   * Update class performance for a teacher
   * PATCH /api/teachers/:teacherId/performance/:className
   */
  static async updateClassPerformance(req, res) {
    const schoolId = req.user?.schoolId;
    
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { teacherId, className } = req.params;
    const performanceData = req.body;
    
    // Verify teacher exists and belongs to school
    const teacher = await TeacherModel.getTeacherById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }
    
    if (teacher.schoolId !== schoolId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = await TeacherModel.updateClassPerformance(teacherId, className, performanceData);
    res.json(result);
  }

  /**
   * Get teachers by subject
   * GET /api/teachers/subject/:subject
   */
  static async getTeachersBySubject(req, res) {
    const schoolId = req.user?.schoolId;
    
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { subject } = req.params;
    
    try {
      const teachers = await TeacherModel.getTeachersBySubject(schoolId, subject);
      res.json({ success: true, teachers });
    } catch (err) {
      console.error('Get teachers by subject error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch teachers' });
    }
  }

  /**
   * Get teachers by class
   * GET /api/teachers/class/:className
   */
  static async getTeachersByClass(req, res) {
    const schoolId = req.user?.schoolId;
    
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { className } = req.params;
    
    try {
      const teachers = await TeacherModel.getTeachersByClass(schoolId, className);
      res.json({ success: true, teachers });
    } catch (err) {
      console.error('Get teachers by class error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch teachers' });
    }
  }

  /**
   * Get teacher statistics/dashboard
   * GET /api/teachers/stats/dashboard
   */
  static async getTeacherStats(req, res) {
    const schoolId = req.user?.schoolId;
    
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const teachers = await TeacherModel.getAllTeachers(schoolId);
      
      const stats = {
        totalTeachers: teachers.length,
        subjects: [...new Set(teachers.map(t => t.subject))],
        averageAttendance: teachers.length > 0 
          ? Math.round(teachers.reduce((sum, t) => sum + (t.attendance || 0), 0) / teachers.length)
          : 0,
        averagePerformance: teachers.length > 0
          ? Math.round(teachers.reduce((sum, t) => sum + TeacherModel.calculateOverallPerformance(t), 0) / teachers.length)
          : 0,
        subjectCount: [...new Set(teachers.map(t => t.subject))].length,
        classCount: [...new Set(teachers.flatMap(t => t.classesAssigned || []))].length
      };
      
      res.json({ success: true, stats });
    } catch (err) {
      console.error('Get teacher stats error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch teacher statistics' });
    }
  }

  /**
   * Get attendance for a specific date
   * GET /api/teacher-attendance
   */
  static async getAttendance(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { date, teacherId } = req.query;
    
    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required' });
    }

    try {
      console.log(`📥 Getting teacher attendance for school: ${schoolId}, date: ${date}`);
      
      const records = await TeacherModel.getAttendance(schoolId, date, teacherId || 'all');
      
      // Get teacher names for display
      const teachers = await TeacherModel.getAllTeachers(schoolId);
      const teacherMap = {};
      teachers.forEach(t => {
        teacherMap[t.teacherId || t.id] = t.name || 'Unknown';
      });

      const recordsWithNames = records.map(record => {
        if (record.isHoliday) {
          return record;
        }
        return {
          ...record,
          teacherName: teacherMap[record.teacherId] || 'Unknown'
        };
      });

      // Check if it's a holiday
      const holidayRecords = recordsWithNames.filter(r => r.isHoliday === true);
      if (holidayRecords.length > 0) {
        return res.json({
          success: true,
          records: [{
            isHoliday: true,
            reason: holidayRecords[0].reason || 'Holiday',
            date: date
          }],
          summary: {
            present: 0,
            absent: 0,
            total: 0,
            date,
            isHoliday: true
          }
        });
      }

      const present = recordsWithNames.filter(r => r.status === 'present').length;
      const absent = recordsWithNames.filter(r => r.status === 'absent').length;

      res.json({
        success: true,
        records: recordsWithNames,
        summary: {
          present,
          absent,
          total: recordsWithNames.length,
          date,
          isHoliday: false
        }
      });
    } catch (err) {
      console.error('Get teacher attendance error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch teacher attendance' });
    }
  }

  /**
   * Save attendance records
   */
  static async saveAttendance(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { date, records, holiday } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required' });
    }

    try {
      console.log(`📤 Saving teacher attendance for school: ${schoolId}, date: ${date}`);
      console.log(`📤 Records: ${records?.length || 0}`);

      // Check if it's a holiday
      if (holiday) {
        const result = await TeacherModel.saveHoliday(schoolId, date, {
          isHoliday: true,
          reason: holiday.reason || 'Holiday'
        });
        return res.json(result);
      }

      if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid attendance data' });
      }

      const formattedRecords = records.map(record => ({
        teacherId: record.teacherId,
        status: record.status,
        date: date
      }));

      const result = await TeacherModel.saveAttendance(schoolId, {
        date,
        records: formattedRecords
      });

      res.json(result);
    } catch (err) {
      console.error('Save teacher attendance error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to save attendance' });
    }
  }

  /**
   * Get monthly attendance statistics
   */
  static async getMonthlyAttendanceStats(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, error: 'Month is required' });
    }

    try {
      const stats = await TeacherModel.getMonthlyAttendanceStats(schoolId, month);
      
      if (!stats) {
        return res.status(404).json({ success: false, error: 'No data found for this month' });
      }

      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('Get monthly teacher attendance stats error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch monthly attendance stats' });
    }
  }

  /**
   * Get teacher attendance summary for a date range
   */
  static async getTeacherAttendanceSummary(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { teacherId } = req.params;
    const { startDate, endDate } = req.query;

    if (!teacherId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Teacher ID, start date, and end date are required' });
    }

    try {
      const summary = await TeacherModel.getTeacherAttendanceSummary(
        schoolId, 
        teacherId, 
        startDate, 
        endDate
      );
      
      if (!summary) {
        return res.status(404).json({ success: false, error: 'No attendance records found' });
      }

      res.json({ success: true, data: summary });
    } catch (err) {
      console.error('Get teacher attendance summary error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch teacher attendance summary' });
    }
  }

  /**
   * Get attendance by teacher for a specific date
   */
  static async getAttendanceByTeacher(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { teacherId } = req.params;
    const { date } = req.query;

    if (!teacherId || !date) {
      return res.status(400).json({ success: false, error: 'Teacher ID and date are required' });
    }

    try {
      const record = await TeacherModel.getAttendanceByTeacher(schoolId, teacherId, date);
      
      if (!record) {
        return res.status(404).json({ success: false, error: 'No attendance record found' });
      }

      res.json({ success: true, data: record });
    } catch (err) {
      console.error('Get teacher attendance by teacher error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch teacher attendance' });
    }
  }

  /**
   * Delete teacher attendance
   */
  static async deleteTeacherAttendance(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { teacherId } = req.params;
    const { date } = req.query;

    if (!teacherId || !date) {
      return res.status(400).json({ success: false, error: 'Teacher ID and date are required' });
    }

    try {
      const result = await TeacherModel.deleteTeacherAttendance(schoolId, teacherId, date);
      res.json(result);
    } catch (err) {
      console.error('Delete teacher attendance error:', err);
      res.status(500).json({ success: false, error: 'Failed to delete teacher attendance' });
    }
  }

  /**
   * Export attendance as CSV
   */
  static async exportAttendanceCSV(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Start date and end date are required' });
    }

    try {
      const teachers = await TeacherModel.getAllTeachers(schoolId);
      const headers = ['Teacher ID', 'Teacher Name', 'Subject'];
      
      const dates = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        dates.push(dateStr);
        headers.push(dateStr);
        current.setDate(current.getDate() + 1);
      }

      const rows = [];
      for (const teacher of teachers) {
        const row = [
          teacher.teacherId || teacher.id,
          teacher.name || 'Unknown',
          teacher.subject || 'N/A'
        ];

        for (const date of dates) {
          const snapshot = await rtdb.ref(
            `schools/${schoolId}/teacherAttendance/${date}/${teacher.teacherId || teacher.id}`
          ).once('value');
          
          const status = snapshot.exists() ? snapshot.val().status : 'absent';
          row.push(status === 'present' ? 'P' : 'A');
        }

        rows.push(row);
      }

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=teacher_attendance_${startDate}_to_${endDate}.csv`);
      res.send(csvContent);
    } catch (err) {
      console.error('Export teacher attendance CSV error:', err);
      res.status(500).json({ success: false, error: 'Failed to export attendance' });
    }
  }

}

module.exports = TeacherController;