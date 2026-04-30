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
}

module.exports = TeacherController;