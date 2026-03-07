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
}

module.exports = StudentController;