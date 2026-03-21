const StudentModel = require('../Model/StudentModel');

class StudentController {
  static async createStudent(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || req.user.role !== 'school_admin') {
      return res.status(403).json({ success: false, error: 'School admin access required' });
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
    if (!schoolId || req.user.role !== 'school_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const students = await StudentModel.listStudents(schoolId);
      res.json({ success: true, students });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch students' });
    }
  }

  static async getStudent(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || req.user.role !== 'school_admin') {
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
    if (!schoolId || req.user.role !== 'school_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { studentId } = req.params;
    const updates = req.body;
    const result = await StudentModel.updateStudent(schoolId, studentId, updates);
    res.json(result);
  }

  static async deleteStudent(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || req.user.role !== 'school_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { studentId } = req.params;
    const result = await StudentModel.deleteStudent(schoolId, studentId);
    res.json(result);
  }

  // === Fees Installment CRUD ===
  static async addInstallment(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || req.user.role !== 'school_admin') return res.status(403).json({ error: 'Forbidden' });
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

  if (!schoolId || req.user.role !== 'school_admin') {
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

  if (!schoolId || req.user.role !== 'school_admin') {
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
    if (!schoolId || req.user.role !== 'school_admin') {
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
    if (!schoolId || req.user.role !== 'school_admin') {
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
    if (!schoolId || req.user.role !== 'school_admin') {
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
    if (!schoolId || req.user.role !== 'school_admin') return res.status(403).json({ error: 'Forbidden' });
    const { studentId } = req.params;
    const result = await StudentModel.updateMarks(schoolId, studentId, req.body);
    res.json(result);
  }
  /**
 * Search students by multiple criteria
 * @route GET /students/search
 * @access School Admin only
 */
static async searchStudents(req, res) {
  const schoolId = req.user?.schoolId;

  if (!schoolId || req.user.role !== 'school_admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: School admin access required'
    });
  }

  try {
    const criteria = req.query; // name, admissionNo, grade, section, fatherName, motherName, aadhar, ...

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

// In StudentController.js - Add these methods

  // === Assessment Reports ===
  
  static async getAssessments(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || req.user.role !== 'school_admin') {
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
    if (!schoolId || req.user.role !== 'school_admin') {
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
    if (!schoolId || req.user.role !== 'school_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, categoryId } = req.params;
    const result = await StudentModel.updateAssessmentCategory(schoolId, studentId, categoryId, req.body);
    res.json(result);
  }

  static async deleteAssessmentCategory(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || req.user.role !== 'school_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, categoryId } = req.params;
    const result = await StudentModel.deleteAssessmentCategory(schoolId, studentId, categoryId);
    res.json(result);
  }

  static async addAssessment(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || req.user.role !== 'school_admin') {
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
    if (!schoolId || req.user.role !== 'school_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, assessmentId } = req.params;
    const result = await StudentModel.updateAssessment(schoolId, studentId, assessmentId, req.body);
    res.json(result);
  }

  static async deleteAssessment(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || req.user.role !== 'school_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { studentId, assessmentId } = req.params;
    const result = await StudentModel.deleteAssessment(schoolId, studentId, assessmentId);
    res.json(result);
  }
}

module.exports = StudentController;