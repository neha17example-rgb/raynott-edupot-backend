// Controller/StudentController.js
const StudentModel = require('../Model/StudentModel');
const { admin, rtdb } = require('../Config/firebaseAdmin'); 

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
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { studentId } = req.params;
    const result = await StudentModel.updateMarks(schoolId, studentId, req.body);
    res.json(result);
  }

  /**
   * Search students by multiple criteria
   */
  static async searchStudents(req, res) {
    const schoolId = req.user?.schoolId;

    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: School access required'
      });
    }

    try {
      const criteria = req.query;
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
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, categoryId } = req.params;
    const result = await StudentModel.updateAssessmentCategory(schoolId, studentId, categoryId, req.body);
    res.json(result);
  }

  static async deleteAssessmentCategory(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, categoryId } = req.params;
    const result = await StudentModel.deleteAssessmentCategory(schoolId, studentId, categoryId);
    res.json(result);
  }

  static async addAssessment(req, res) {
    const schoolId = req.user?.schoolId;
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
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, assessmentId } = req.params;
    const result = await StudentModel.updateAssessment(schoolId, studentId, assessmentId, req.body);
    res.json(result);
  }

  static async deleteAssessment(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, assessmentId } = req.params;
    const result = await StudentModel.deleteAssessment(schoolId, studentId, assessmentId);
    res.json(result);
  }

  // === Class Exam Management ===

  /**
   * Create class exam - Updated to fetch subjects from database
   */
  static async createClassExam(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section } = req.params;
    
    try {
      // ⭐ Fetch subjects from database first
      const subjectsSnapshot = await rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/subjects`
      ).once('value');
      
      let subjects = [];
      if (subjectsSnapshot.exists()) {
        const subjectsData = subjectsSnapshot.val();
        if (typeof subjectsData === 'object' && !Array.isArray(subjectsData)) {
          subjects = Object.values(subjectsData);
        } else if (Array.isArray(subjectsData)) {
          subjects = subjectsData;
        }
      }
      
      // Generate exam ID
      const examId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newExam = {
        id: examId,
        examType: req.body.examType,
        examDate: req.body.examDate,
        subjects: subjects, // ⭐ Use fetched subjects
        createdAt: admin.database.ServerValue.TIMESTAMP,
        marks: {}
      };

      await rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}`
      ).set(newExam);
      
      res.json({ success: true, examId, exam: newExam });
    } catch (err) {
      console.error('Create class exam error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get class exams - Updated to include subjects
   */
  static async getClassExams(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section } = req.params;

    try {
      // ⭐ Get subjects first
      let classSubjects = [];
      const subjectsSnapshot = await rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/subjects`
      ).once('value');
      
      if (subjectsSnapshot.exists()) {
        const subjectsData = subjectsSnapshot.val();
        if (typeof subjectsData === 'object' && !Array.isArray(subjectsData)) {
          classSubjects = Object.values(subjectsData);
        } else if (Array.isArray(subjectsData)) {
          classSubjects = subjectsData;
        }
      }
      
      // Get exams
      const snapshot = await rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/exams`
      ).once('value');
      
      if (!snapshot.exists()) {
        return res.json({ success: true, exams: [] });
      }
      
      const exams = [];
      snapshot.forEach(child => {
        const exam = { id: child.key, ...child.val() };
        
        // ⭐ Ensure exam has subjects
        if (!exam.subjects || exam.subjects.length === 0) {
          exam.subjects = classSubjects;
        }
        
        exams.push(exam);
      });
      
      res.json({ success: true, exams });
    } catch (err) {
      console.error('Get class exams error:', err);
      res.status(500).json({ success: false, error: err.message, exams: [] });
    }
  }

  /**
   * Update student marks for class exam
   */
  static async updateStudentClassExamMarks(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section, examId, studentId } = req.params;
    
    try {
      const marksData = req.body.marks;
      
      if (!marksData || !Array.isArray(marksData)) {
        return res.status(400).json({ success: false, error: 'Invalid marks data' });
      }
      
      const ref = rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}/marks/${studentId}`
      );
      
      // Calculate total and percentage
      const totalMarks = marksData.reduce((sum, m) => sum + (m.marks || 0), 0);
      const totalPossible = marksData.reduce((sum, m) => sum + (m.total || 0), 0);
      const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
      
      const data = {
        marks: marksData,
        totalMarks,
        percentage: Math.round(percentage * 10) / 10,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };
      
      await ref.set(data);
      res.json({ success: true });
    } catch (err) {
      console.error('Update class exam marks error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get student's marks for all class exams
   */
  static async getStudentClassExamMarks(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section, studentId } = req.params;
    
    try {
      const snapshot = await rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/exams`
      ).once('value');
      
      if (!snapshot.exists()) {
        return res.json({ success: true, marks: [] });
      }
      
      const results = [];
      snapshot.forEach(examChild => {
        const examId = examChild.key;
        const examData = examChild.val();
        const studentMarks = examData.marks?.[studentId] || null;
        
        results.push({
          examId,
          examType: examData.examType,
          examDate: examData.examDate,
          subjects: examData.subjects,
          marks: studentMarks
        });
      });
      
      res.json({ success: true, marks: results });
    } catch (err) {
      console.error('Get student class exam marks error:', err);
      res.status(500).json({ success: false, error: err.message, marks: [] });
    }
  }

  /**
   * Delete class exam
   */
  static async deleteClassExam(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { grade, section, examId } = req.params;
    
    try {
      await rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}`
      ).remove();
      res.json({ success: true });
    } catch (err) {
      console.error('Delete class exam error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
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

    try {
      await rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/subjects`
      ).set(subjects);
      
      res.json({ success: true });
    } catch (err) {
      console.error('Setup class subjects error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
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
    
    try {
      const snapshot = await rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/subjects`
      ).once('value');
      
      if (!snapshot.exists()) {
        return res.json({ success: true, subjects: [] });
      }
      
      const subjects = snapshot.val();
      let subjectsArray = [];
      
      if (typeof subjects === 'object' && !Array.isArray(subjects)) {
        subjectsArray = Object.values(subjects);
      } else if (Array.isArray(subjects)) {
        subjectsArray = subjects;
      }
      
      res.json({ success: true, subjects: subjectsArray });
    } catch (err) {
      console.error('Get class subjects error:', err);
      res.status(500).json({ success: false, error: err.message, subjects: [] });
    }
  }

  // === Attendance Management ===

  /**
   * Get attendance for a specific date
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
   */
  // static async saveAttendance(req, res) {
  //   const schoolId = req.user?.schoolId;
  //   if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
  //     return res.status(403).json({ success: false, error: 'Forbidden' });
  //   }

  //   const { date, records, class: classFilter } = req.body;

  //   if (!date || !records || !Array.isArray(records) || records.length === 0) {
  //     return res.status(400).json({ success: false, error: 'Invalid attendance data' });
  //   }

  //   try {
  //     const recordsWithClass = records.map(record => ({
  //       ...record,
  //       class: record.class || classFilter || ''
  //     }));

  //     const result = await StudentModel.saveAttendance(schoolId, {
  //       date,
  //       records: recordsWithClass
  //     });

  //     res.json(result);
  //   } catch (err) {
  //     console.error('Save attendance error:', err);
  //     res.status(500).json({ success: false, error: err.message || 'Failed to save attendance' });
  //   }
  // }

  /**
   * Get student attendance summary
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
      const students = await StudentModel.listStudents(schoolId);
      const filteredStudents = classFilter && classFilter !== 'all' 
        ? students.filter(s => (s.class || s.basicInfo?.grade) === classFilter)
        : students;

      const headers = ['Student ID', 'Student Name', 'Roll Number', 'Class'];
      
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

static async migrateExamMarks(req, res) {
  const schoolId = req.user?.schoolId;
  if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  const { grade, section, examId } = req.params;
  const { subjects } = req.body;

  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ success: false, error: 'Subjects array is required' });
  }

  try {
    const result = await StudentModel.migrateExamMarks(schoolId, grade, section, examId, subjects);
    
    if (result.success) {
      res.json({ success: true, message: 'Marks migrated successfully' });
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('Migrate exam marks error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

static async updateExamSubjects(req, res) {
  const schoolId = req.user?.schoolId;
  if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  const { grade, section, examId } = req.params;
  const { subjects } = req.body;

  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ success: false, error: 'Subjects array is required' });
  }

  try {
    // Update the exam with new subjects
    const examRef = rtdb.ref(
      `schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}`
    );
    
    await examRef.update({
      subjects: subjects,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });
    
    res.json({ success: true, message: 'Exam subjects updated successfully' });
  } catch (err) {
    console.error('Update exam subjects error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Model/StudentModel.js

/**
 * Get attendance for a specific date and class - FIXED
 */
static async getAttendance(schoolId, date, classFilter = 'all') {
  try {
    const refPath = this.ATTENDANCE_REF(schoolId, date);
    console.log(`📥 [MODEL] Fetching attendance from: ${refPath}`);
    
    const snapshot = await rtdb.ref(refPath).once('value');
    
    console.log(`📥 [MODEL] Snapshot exists: ${snapshot.exists()}`);
    
    if (!snapshot.exists()) {
      console.log(`📥 [MODEL] No attendance found for ${date}`);
      return [];
    }

    const allRecords = snapshot.val();
    console.log(`📥 [MODEL] Raw records from Firebase:`, JSON.stringify(allRecords, null, 2));
    
    // Check if it's a holiday (stored at the root level)
    if (allRecords.isHoliday === true) {
      console.log(`📥 [MODEL] Holiday found: ${allRecords.reason}`);
      return [{
        isHoliday: true,
        reason: allRecords.reason || 'Holiday',
        date: date
      }];
    }

    const records = [];
    
    // CRITICAL FIX: Iterate over the keys of allRecords
    Object.keys(allRecords).forEach(studentId => {
      const record = allRecords[studentId];
      
      // Skip holiday marker
      if (record.isHoliday === true) return;
      
      // Skip if not a valid attendance record
      if (!record.status) {
        console.warn(`⚠️ [MODEL] Invalid record for student ${studentId}:`, record);
        return;
      }
      
      // CRITICAL FIX: Check if the record matches the class filter
      let matchesClass = false;
      
      if (classFilter === 'all') {
        matchesClass = true;
      } else if (classFilter.includes('-')) {
        // Filter is like "9-A" - split and compare class AND section
        const [filterClass, filterSection] = classFilter.split('-');
        matchesClass = record.class === filterClass && record.section === filterSection;
        console.log(`📥 [MODEL] Comparing: ${record.class}-${record.section} vs ${filterClass}-${filterSection} => ${matchesClass}`);
      } else {
        // Filter is just a class name like "9"
        matchesClass = record.class === classFilter;
      }
      
      if (matchesClass) {
        records.push({
          studentId: studentId, // Use the key as studentId
          status: record.status, // Preserve exact status
          class: record.class || '',
          section: record.section || '',
          date: record.date || date,
          updatedAt: record.updatedAt || null
        });
      }
    });

    console.log(`📥 [MODEL] Returning ${records.length} filtered records`);
    console.log(`📥 [MODEL] Records:`, JSON.stringify(records, null, 2));
    
    return records;
  } catch (err) {
    console.error('❌ [MODEL] Get attendance error:', err);
    return [];
  }
}

// Controller/StudentController.js

/**
 * Get attendance for a specific date - FIXED
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
    console.log(`📥 [CONTROLLER] Getting attendance for school: ${schoolId}, date: ${date}, class: ${classFilter}`);
    
    // CRITICAL FIX: Log the full path being queried
    const refPath = `schools/${schoolId}/attendance/${date}`;
    console.log(`📥 [CONTROLLER] Querying path: ${refPath}`);
    
    const records = await StudentModel.getAttendance(schoolId, date, classFilter || 'all');
    
    console.log(`📥 [CONTROLLER] Found ${records.length} attendance records`);
    
    // Check if it's a holiday
    const holidayRecords = records.filter(r => r.isHoliday === true);
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
    console.error('❌ [CONTROLLER] Get attendance error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
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

  const { date, records, class: classFilter } = req.body;

  if (!date || !records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, error: 'Invalid attendance data' });
  }

  try {
    console.log(`📤 Saving attendance for school: ${schoolId}, date: ${date}`);
    console.log('📤 Records:', JSON.stringify(records, null, 2));

    // Check if it's a holiday
    const isHoliday = records.some(r => r.isHoliday === true);
    
    if (isHoliday) {
      console.log('📤 Saving holiday...');
      const holidayRecord = records.find(r => r.isHoliday === true);
      
      const result = await StudentModel.saveHoliday(schoolId, date, {
        isHoliday: true,
        reason: holidayRecord.reason || 'Holiday',
        class: classFilter || '',
        section: holidayRecord.section || ''
      });
      
      console.log('📤 Holiday save result:', result);
      return res.json(result);
    }

    // CRITICAL FIX: Save regular attendance with preserved status
    console.log('📤 Saving regular attendance...');
    const recordsWithClass = records.map(record => ({
      ...record,
      // CRITICAL: Preserve the status exactly as received
      status: record.status,
      class: record.class || classFilter || '',
      date: date
    }));

    const result = await StudentModel.saveAttendance(schoolId, {
      date,
      records: recordsWithClass
    });

    console.log('📤 Save result:', result);
    res.json(result);
  } catch (err) {
    console.error('Save attendance error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save attendance' });
  }
}}

module.exports = StudentController;