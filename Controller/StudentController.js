const StudentModel = require('../Model/StudentModel');

class StudentController {
  static async createStudent(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'School access required' });
    }

    const studentData = req.body;
    if (!studentData.basicInfo?.name || !studentData.basicInfo?.admissionNo) {
      return res.status(400).json({ success: false, error: 'Name and admission number required' });
    }

    const result = await StudentModel.createStudent(schoolId, studentData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  }

  // In StudentController.js - make sure this exists
static async getAllStudents(req, res) {
  const schoolId = req.user?.schoolId;
  if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const students = await StudentModel.listStudents(schoolId);
    res.json({ success: true, students });
  } catch (err) {
    console.error('Get all students error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
}

  static async getStudent(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { studentId } = req.params;
    const student = await StudentModel.getStudent(schoolId, studentId);
    if (student) {
      res.json({ success: true, student });
    } else {
      res.status(404).json({ success: false, error: 'Student not found' });
    }
  }

  static async updateStudent(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { studentId } = req.params;
    const updates = req.body;
    const result = await StudentModel.updateStudent(schoolId, studentId, updates);
    res.json(result);
  }

  static async deleteStudent(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { studentId } = req.params;
    const result = await StudentModel.deleteStudent(schoolId, studentId);
    res.json(result);
  }

  // === Fees Installment CRUD ===
  static async addInstallment(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { studentId } = req.params;
    const result = await StudentModel.addInstallment(schoolId, studentId, req.body);
    res.json(result);
  }

  static async updateInstallment(req, res) {
    const schoolId = req.user?.schoolId;
    const { studentId, installmentId } = req.params;
    const updates = req.body;

    console.log(`[UPDATE INSTALLMENT] ${new Date().toISOString()}`);
    console.log("  schoolId     :", schoolId);
    console.log("  studentId    :", studentId);
    console.log("  installmentId:", installmentId);
    console.log("  updates      :", updates);
    console.log("  user         :", req.user?.email || req.user?.uid || "unknown");

    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      console.log("→ Forbidden - missing schoolId or role");
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await StudentModel.updateInstallment(schoolId, studentId, installmentId, updates);

    console.log("→ Result:", result);

    res.json(result);
  }

  static async deleteInstallment(req, res) {
    const schoolId = req.user?.schoolId;
    const { studentId, installmentId } = req.params;

    console.log(`[DELETE INSTALLMENT] ${new Date().toISOString()}`);
    console.log("  schoolId      :", schoolId);
    console.log("  studentId     :", studentId);
    console.log("  installmentId :", installmentId);
    console.log("  type of id    :", typeof installmentId);

    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      console.log("→ Forbidden");
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await StudentModel.deleteInstallment(schoolId, studentId, installmentId);

    console.log("→ Delete result:", result);

    res.json(result);
  }

  // === Marks (full marks object) ===
  static async getMarks(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId } = req.params;

    try {
      const marks = await StudentModel.getMarks(schoolId, studentId);
      if (!marks) {
        return res.status(404).json({ success: false, error: 'Marks not found' });
      }
      res.json({ success: true, marks });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch marks' });
    }
  }

  static async addExam(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId } = req.params;
    const examData = req.body;

    if (!examData.examType) {
      return res.status(400).json({ success: false, error: 'examType is required' });
    }

    const result = await StudentModel.addExam(schoolId, studentId, examData);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  }

  static async deleteExam(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, examId } = req.params;

    const result = await StudentModel.deleteExam(schoolId, studentId, examId);

    if (result.success) {
      res.json({ success: true, message: 'Exam deleted' });
    } else {
      res.status(400).json(result);
    }
  }
  
  static async updateMarks(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { studentId } = req.params;
    const result = await StudentModel.updateMarks(schoolId, studentId, req.body);
    res.json(result);
  }

  /**
   * Search students by multiple criteria
   * @route GET /students/search
   * @access School users only
   */
  static async searchStudents(req, res) {
    const schoolId = req.user?.schoolId;

    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: School access required'
      });
    }

    try {
      const criteria = req.query;
      // Optional: clean up empty strings
      Object.keys(criteria).forEach(key => {
        if (criteria[key] === '') delete criteria[key];
      });

      const students = await StudentModel.searchStudents(schoolId, criteria);

      return res.json({
        success: true,
        students,
        count: students.length,
        message: students.length === 0 ? 'No matching students found' : undefined
      });
    } catch (err) {
      console.error('Search students controller error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to search students'
      });
    }
  }

  // === Assessment Reports ===
  
  static async getAssessments(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId } = req.params;

    try {
      const assessments = await StudentModel.getAssessments(schoolId, studentId);
      res.json({ success: true, assessments });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch assessments' });
    }
  }

  static async addAssessmentCategory(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId } = req.params;
    const result = await StudentModel.addAssessmentCategory(schoolId, studentId, req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  }

  static async updateAssessmentCategory(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, categoryId } = req.params;
    const result = await StudentModel.updateAssessmentCategory(schoolId, studentId, categoryId, req.body);
    res.json(result);
  }

  static async deleteAssessmentCategory(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, categoryId } = req.params;
    const result = await StudentModel.deleteAssessmentCategory(schoolId, studentId, categoryId);
    res.json(result);
  }

  static async addAssessment(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId } = req.params;
    const result = await StudentModel.addAssessment(schoolId, studentId, req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  }

  static async updateAssessment(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, assessmentId } = req.params;
    const result = await StudentModel.updateAssessment(schoolId, studentId, assessmentId, req.body);
    res.json(result);
  }

  static async deleteAssessment(req, res) {
    const schoolId = req.user?.schoolId;
    // Allow both school_admin AND school_user
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, assessmentId } = req.params;
    const result = await StudentModel.deleteAssessment(schoolId, studentId, assessmentId);
    res.json(result);
  }

  // Create class exam
  static async createClassExam(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section } = req.params;
    const result = await StudentModel.createClassExam(schoolId, grade, section, req.body);
    res.json(result);
  }

  // Get class exams
  static async getClassExams(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section } = req.params;
    const exams = await StudentModel.getClassExams(schoolId, grade, section);
    res.json({ success: true, exams });
  }

  // Update student marks for class exam
  static async updateStudentClassExamMarks(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section, examId, studentId } = req.params;
    const result = await StudentModel.updateStudentClassExamMarks(
      schoolId, grade, section, examId, studentId, req.body.marks
    );
    res.json(result);
  }

  // Get student's class exam marks
  static async getStudentClassExamMarks(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section, studentId } = req.params;
    const marks = await StudentModel.getStudentClassExamMarks(schoolId, grade, section, studentId);
    res.json({ success: true, marks });
  }

  // Delete class exam
  static async deleteClassExam(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section, examId } = req.params;
    const result = await StudentModel.deleteClassExam(schoolId, grade, section, examId);
    res.json(result);
  }
   /**
   * Setup class subjects
   */
  static async setupClassSubjects(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section } = req.params;
    const { subjects } = req.body;
    
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ success: false, error: 'Subjects array is required' });
    }

    const result = await StudentModel.setupClassSubjects(schoolId, grade, section, subjects);
    res.json(result);
  }

  /**
   * Get class subjects
   */
  static async getClassSubjects(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section } = req.params;
    const subjects = await StudentModel.getClassSubjects(schoolId, grade, section);
    res.json({ success: true, subjects });
  }

  // Override the createClassExam to use class subjects
  static async createClassExam(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section } = req.params;
    const result = await StudentModel.createClassExam(schoolId, grade, section, req.body);
    res.json(result);
  }
  
  
  /**
   * Get attendance for a specific date
   * @route GET /attendance?date=YYYY-MM-DD&class=CLASS
   */
  static async getAttendance(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { date, class: classFilter } = req.query;
    
    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required' });
    }

    try {
      const records = await StudentModel.getAttendance(schoolId, date, classFilter || 'all');
      
      // Get student names for display
      const students = await StudentModel.listStudents(schoolId);
      const studentMap = {};
      students.forEach(s => {
        studentMap[s.studentId] = s.basicInfo?.name || 'Unknown';
      });

      const recordsWithNames = records.map(record => ({
        ...record,
        studentName: studentMap[record.studentId] || 'Unknown'
      }));

      // Calculate summary
      const present = recordsWithNames.filter(r => r.status === 'present').length;
      const absent = recordsWithNames.filter(r => r.status === 'absent').length;

      res.json({
        success: true,
        records: recordsWithNames,
        summary: {
          present,
          absent,
          total: recordsWithNames.length,
          date
        }
      });
    } catch (err) {
      console.error('Get attendance error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
    }
  }

  /**
   * Save attendance records
   * @route POST /attendance
   */
  static async saveAttendance(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { date, records, class: classFilter } = req.body;

    if (!date || !records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid attendance data' });
    }

    try {
      // Add class info to each record if not present
      const recordsWithClass = records.map(record => ({
        ...record,
        class: record.class || classFilter || ''
      }));

      const result = await StudentModel.saveAttendance(schoolId, {
        date,
        records: recordsWithClass
      });

      res.json(result);
    } catch (err) {
      console.error('Save attendance error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to save attendance' });
    }
  }

  /**
   * Get student attendance summary
   * @route GET /attendance/student/:studentId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  static async getStudentAttendanceSummary(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    if (!studentId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Student ID, start date, and end date are required' });
    }

    try {
      const summary = await StudentModel.getStudentAttendanceSummary(schoolId, studentId, startDate, endDate);
      
      if (!summary) {
        return res.status(404).json({ success: false, error: 'No attendance records found' });
      }

      res.json({ success: true, data: summary });
    } catch (err) {
      console.error('Get student attendance summary error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch attendance summary' });
    }
  }

  /**
   * Get class attendance report
   * @route GET /attendance/report/class/:classId?month=YYYY-MM
   */
  static async getClassAttendanceReport(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { classId } = req.params;
    const { month } = req.query;

    if (!classId || !month) {
      return res.status(400).json({ success: false, error: 'Class ID and month are required' });
    }

    try {
      const report = await StudentModel.getClassAttendanceReport(schoolId, classId, month);
      
      if (!report) {
        return res.status(404).json({ success: false, error: 'No data found for this class and month' });
      }

      res.json({ success: true, data: report });
    } catch (err) {
      console.error('Get class attendance report error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch class attendance report' });
    }
  }

  /**
   * Get monthly attendance statistics
   * @route GET /attendance/stats/monthly?month=YYYY-MM&class=CLASS
   */
  static async getMonthlyAttendanceStats(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { month, class: classFilter } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, error: 'Month is required' });
    }

    try {
      const stats = await StudentModel.getMonthlyAttendanceStats(schoolId, month, classFilter || 'all');
      
      if (!stats) {
        return res.status(404).json({ success: false, error: 'No data found for this month' });
      }

      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('Get monthly attendance stats error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch monthly attendance stats' });
    }
  }

  /**
   * Bulk mark attendance
   * @route POST /attendance/bulk
   */
  static async bulkMarkAttendance(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { date, class: classFilter, attendance } = req.body;

    if (!date || !attendance || !Array.isArray(attendance) || attendance.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid bulk attendance data' });
    }

    try {
      const result = await StudentModel.bulkMarkAttendance(schoolId, {
        date,
        class: classFilter || '',
        attendance
      });

      res.json(result);
    } catch (err) {
      console.error('Bulk mark attendance error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to mark bulk attendance' });
    }
  }

  /**
   * Export attendance report as CSV
   * @route POST /attendance/export/csv
   */
  static async exportAttendanceCSV(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { startDate, endDate, class: classFilter } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Start date and end date are required' });
    }

    try {
      // Get all students
      const students = await StudentModel.listStudents(schoolId);
      const filteredStudents = classFilter && classFilter !== 'all' 
        ? students.filter(s => (s.class || s.basicInfo?.grade) === classFilter)
        : students;

      // Build CSV data
      const headers = ['Student ID', 'Student Name', 'Roll Number', 'Class'];
      
      // Get all dates in range
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

      // Get attendance for each student
      const rows = [];
      for (const student of filteredStudents) {
        const row = [
          student.studentId,
          student.basicInfo?.name || 'Unknown',
          student.basicInfo?.admissionNo || student.rollNumber || '-',
          student.class || student.basicInfo?.grade || '-'
        ];

        for (const date of dates) {
          const snapshot = await rtdb.ref(
            `${StudentModel.ATTENDANCE_REF(schoolId, date)}/${student.studentId}`
          ).once('value');
          
          const status = snapshot.exists() ? snapshot.val().status : 'absent';
          row.push(status === 'present' ? 'P' : 'A');
        }

        rows.push(row);
      }

      // Generate CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_${startDate}_to_${endDate}.csv`);
      res.send(csvContent);
    } catch (err) {
      console.error('Export attendance CSV error:', err);
      res.status(500).json({ success: false, error: 'Failed to export attendance' });
    }
  }
}

module.exports = StudentController;