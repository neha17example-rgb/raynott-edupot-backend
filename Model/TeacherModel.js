// models/TeacherModel.js
const { admin, rtdb } = require('../Config/firebaseAdmin');

class TeacherModel {
  static TEACHERS_REF = 'teachers';
  static COUNTERS_REF = 'counters/teacherCounter';

  /**
   * Generate sequential teacher ID: TCH001, TCH002, ...
   */
  static async generateTeacherId() {
    const counterRef = rtdb.ref(this.COUNTERS_REF);
    const result = await counterRef.transaction(
      (current) => (current || 0) + 1,
      (error, committed, snapshot) => {
        if (error) throw error;
        if (!committed) throw new Error('Transaction failed - counter not committed');
        return snapshot.val();
      }
    );
    const counterValue = result.snapshot.val();
    return `TCH${String(counterValue).padStart(3, '0')}`;
  }

  /**
   * Create a new teacher
   */
  static async createTeacher(teacherData, schoolId) {
    try {
      // Validate required fields
      if (!teacherData.name || !teacherData.subject || !teacherData.classesAssigned || teacherData.classesAssigned.length === 0) {
        throw new Error('Name, subject, and at least one class are required');
      }

      // Check if teacher with same email already exists
      if (teacherData.email) {
        const existingSnapshot = await rtdb.ref(this.TEACHERS_REF)
          .orderByChild('email')
          .equalTo(teacherData.email)
          .once('value');
        
        if (existingSnapshot.exists()) {
          throw new Error('Teacher with this email already exists');
        }
      }

      const teacherId = await this.generateTeacherId();

      const fullTeacher = {
        teacherId,
        schoolId,
        name: teacherData.name,
        subject: teacherData.subject,
        classesAssigned: teacherData.classesAssigned || [],
        phone: teacherData.phone || '',
        email: teacherData.email || '',
        remarks: teacherData.remarks || '',
        attendance: teacherData.attendance || 0,
        feedback: teacherData.feedback || '',
        overallPerformance: teacherData.overallPerformance || {},
        joinDate: teacherData.joinDate || new Date().toISOString().split('T')[0],
        status: 'active',
        createdAt: admin.database.ServerValue.TIMESTAMP,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };

      await rtdb.ref(`${this.TEACHERS_REF}/${teacherId}`).set(fullTeacher);

      return { success: true, teacherId, teacher: fullTeacher };
    } catch (error) {
      console.error('Create teacher error:', error);
      return { success: false, error: error.message || 'internal-error' };
    }
  }

  /**
   * Get all teachers for a school
   */
  static async getAllTeachers(schoolId) {
    try {
      const snapshot = await rtdb.ref(this.TEACHERS_REF).once('value');
      if (!snapshot.exists()) return [];
      
      const teachers = [];
      snapshot.forEach((child) => {
        const teacher = child.val();
        // Filter by schoolId if provided
        if (!schoolId || teacher.schoolId === schoolId) {
          teachers.push({ id: child.key, ...teacher });
        }
      });
      
      // Sort by createdAt descending
      teachers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return teachers;
    } catch (err) {
      console.error('Get all teachers error:', err);
      throw err;
    }
  }

  /**
   * Get teacher by ID
   */
  static async getTeacherById(teacherId) {
    try {
      const snapshot = await rtdb.ref(`${this.TEACHERS_REF}/${teacherId}`).once('value');
      const teacher = snapshot.val();
      if (teacher) {
        return { id: teacherId, ...teacher };
      }
      return null;
    } catch (err) {
      console.error('Get teacher by ID error:', err);
      return null;
    }
  }

  /**
   * Update teacher
   */
  static async updateTeacher(teacherId, updates) {
    try {
      const teacherRef = rtdb.ref(`${this.TEACHERS_REF}/${teacherId}`);
      const snapshot = await teacherRef.once('value');
      
      if (!snapshot.exists()) {
        throw new Error('Teacher not found');
      }

      // Remove fields that shouldn't be updated directly
      const allowedUpdates = {
        name: updates.name,
        subject: updates.subject,
        classesAssigned: updates.classesAssigned,
        phone: updates.phone,
        email: updates.email,
        remarks: updates.remarks,
        attendance: updates.attendance,
        feedback: updates.feedback,
        overallPerformance: updates.overallPerformance,
        status: updates.status,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };

      // Remove undefined fields
      Object.keys(allowedUpdates).forEach(key => 
        allowedUpdates[key] === undefined && delete allowedUpdates[key]
      );

      await teacherRef.update(allowedUpdates);
      
      return { success: true };
    } catch (err) {
      console.error('Update teacher error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Delete teacher
   */
  static async deleteTeacher(teacherId) {
    try {
      const teacherRef = rtdb.ref(`${this.TEACHERS_REF}/${teacherId}`);
      const snapshot = await teacherRef.once('value');
      
      if (!snapshot.exists()) {
        throw new Error('Teacher not found');
      }

      await teacherRef.remove();
      return { success: true };
    } catch (err) {
      console.error('Delete teacher error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Update class performance for a teacher
   */
  static async updateClassPerformance(teacherId, className, performanceData) {
    try {
      const teacherRef = rtdb.ref(`${this.TEACHERS_REF}/${teacherId}`);
      const snapshot = await teacherRef.once('value');
      
      if (!snapshot.exists()) {
        throw new Error('Teacher not found');
      }

      const teacher = snapshot.val();
      const currentPerformance = teacher.overallPerformance || {};
      
      const updatedPerformance = {
        ...currentPerformance,
        [className]: {
          averagePercentage: performanceData.averagePercentage || 0,
          totalStudents: performanceData.totalStudents || 0,
          examCount: performanceData.examCount || 0,
          lastUpdated: admin.database.ServerValue.TIMESTAMP
        }
      };

      await teacherRef.update({
        overallPerformance: updatedPerformance,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });
      
      return { success: true };
    } catch (err) {
      console.error('Update class performance error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Get teachers by subject
   */
  static async getTeachersBySubject(schoolId, subject) {
    try {
      const snapshot = await rtdb.ref(this.TEACHERS_REF)
        .orderByChild('subject')
        .equalTo(subject)
        .once('value');
      
      if (!snapshot.exists()) return [];
      
      const teachers = [];
      snapshot.forEach((child) => {
        const teacher = child.val();
        if (!schoolId || teacher.schoolId === schoolId) {
          teachers.push({ id: child.key, ...teacher });
        }
      });
      
      return teachers;
    } catch (err) {
      console.error('Get teachers by subject error:', err);
      throw err;
    }
  }

  /**
   * Get teachers by class
   */
  static async getTeachersByClass(schoolId, className) {
    try {
      const allTeachers = await this.getAllTeachers(schoolId);
      return allTeachers.filter(teacher => 
        teacher.classesAssigned && teacher.classesAssigned.includes(className)
      );
    } catch (err) {
      console.error('Get teachers by class error:', err);
      throw err;
    }
  }

  /**
   * Calculate overall teacher performance
   */
  static calculateOverallPerformance(teacher) {
    const performances = Object.values(teacher.overallPerformance || {});
    if (performances.length === 0) return 0;
    const total = performances.reduce((sum, p) => sum + (p.averagePercentage || 0), 0);
    return Math.round(total / performances.length);
  }
}

module.exports = TeacherModel;