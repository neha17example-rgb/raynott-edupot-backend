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
        designation: teacherData.designation || 'Teacher',
        department: teacherData.department || '',
        qualification: teacherData.qualification || '',
        dob: teacherData.dob || '',
        bloodGroup: teacherData.bloodGroup || '',
        address: teacherData.address || '',
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
        // Add these:
        designation: updates.designation,
        department: updates.department,
        qualification: updates.qualification,
        joiningDate: updates.joiningDate,
        dob: updates.dob,
        bloodGroup: updates.bloodGroup,
        address: updates.address,
        employeeId: updates.employeeId,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };

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

  static ATTENDANCE_REF = (schoolId, date) =>
    `schools/${schoolId}/teacherAttendance/${date}`;

  static COUNTERS_REF = (schoolId) =>
    `counters/schools/${schoolId}/teacherAttendanceCounter`;

  /**
   * Get attendance for a specific date
   * @param {string} schoolId - School ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} teacherFilter - Optional teacher ID filter
   * @returns {Promise<Array>} - Array of attendance records
   */
  static async getAttendance(schoolId, date, teacherFilter = 'all') {
    try {
      const refPath = this.ATTENDANCE_REF(schoolId, date);
      console.log(`📥 [MODEL] Fetching teacher attendance from: ${refPath}`);

      const snapshot = await rtdb.ref(refPath).once('value');

      if (!snapshot.exists()) {
        console.log(`📥 [MODEL] No teacher attendance found for ${date}`);
        return [];
      }

      const allRecords = snapshot.val();
      console.log(`📥 [MODEL] Raw records:`, Object.keys(allRecords).length);

      // Check if it's a holiday
      if (allRecords.isHoliday === true) {
        return [{
          isHoliday: true,
          reason: allRecords.reason || 'Holiday',
          date: date
        }];
      }

      const records = [];
      Object.keys(allRecords).forEach(teacherId => {
        const record = allRecords[teacherId];

        if (record.status) {
          records.push({
            teacherId: teacherId,
            status: record.status,
            date: record.date || date,
            updatedAt: record.updatedAt || null
          });
        }
      });

      console.log(`📥 [MODEL] Returning ${records.length} records`);
      return records;
    } catch (err) {
      console.error('Get teacher attendance error:', err);
      return [];
    }
  }

  /**
   * Save attendance records for a date
   * @param {string} schoolId - School ID
   * @param {Object} attendanceData - { date, records: [{ teacherId, status }] }
   * @returns {Promise<{success: boolean, count: number}>}
   */
  static async saveAttendance(schoolId, attendanceData) {
    try {
      const { date, records } = attendanceData;

      if (!date || !records || !Array.isArray(records) || records.length === 0) {
        throw new Error('Invalid attendance data');
      }

      const refPath = this.ATTENDANCE_REF(schoolId, date);
      const ref = rtdb.ref(refPath);

      const updates = {};
      records.forEach(record => {
        if (!record.teacherId || !record.status) {
          throw new Error('Each record must have teacherId and status');
        }

        updates[record.teacherId] = {
          teacherId: record.teacherId,
          status: record.status,
          date: date,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        };
      });

      await ref.update(updates);

      console.log(`✅ [MODEL] Saved ${records.length} teacher attendance records for ${date}`);

      return {
        success: true,
        count: records.length,
        message: `Attendance saved for ${records.length} teachers`
      };
    } catch (err) {
      console.error('Save teacher attendance error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Save holiday
   * @param {string} schoolId - School ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {Object} holidayData - { reason, isHoliday }
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async saveHoliday(schoolId, date, holidayData) {
    try {
      const ref = rtdb.ref(this.ATTENDANCE_REF(schoolId, date));

      await ref.set({
        isHoliday: true,
        reason: holidayData.reason || 'Holiday',
        date: date,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });

      console.log(`✅ [MODEL] Holiday saved for ${date}: ${holidayData.reason}`);

      return {
        success: true,
        message: 'Holiday marked successfully'
      };
    } catch (err) {
      console.error('Save holiday error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Get monthly attendance statistics
   * @param {string} schoolId - School ID
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<Object>} - Monthly statistics
   */
  static async getMonthlyAttendanceStats(schoolId, month) {
    try {
      const [year, monthNum] = month.split('-').map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();

      const dailyStats = [];
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalTeachers = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const snapshot = await rtdb.ref(this.ATTENDANCE_REF(schoolId, dateStr)).once('value');

        let dayPresent = 0;
        let dayAbsent = 0;

        if (snapshot.exists()) {
          const records = snapshot.val();

          // Check if it's a holiday
          if (records.isHoliday === true) {
            dailyStats.push({
              date: dateStr,
              present: 0,
              absent: 0,
              total: 0,
              isHoliday: true,
              reason: records.reason || 'Holiday'
            });
            continue;
          }

          Object.values(records).forEach(record => {
            if (record.status === 'present') dayPresent++;
            else if (record.status === 'absent') dayAbsent++;
          });
        }

        const dayTotal = dayPresent + dayAbsent;
        dailyStats.push({
          date: dateStr,
          present: dayPresent,
          absent: dayAbsent,
          total: dayTotal,
          isHoliday: false
        });

        totalPresent += dayPresent;
        totalAbsent += dayAbsent;
        if (dayTotal > 0) totalTeachers += dayTotal;
      }

      const totalAttendanceDays = daysInMonth;
      const averageDailyAttendance = totalTeachers > 0
        ? Math.round((totalPresent / (totalTeachers * totalAttendanceDays)) * 100)
        : 0;

      return {
        month,
        totalPresent,
        totalAbsent,
        totalAttendanceDays,
        averageDailyAttendance,
        dailyStats
      };
    } catch (err) {
      console.error('Get monthly teacher attendance stats error:', err);
      return null;
    }
  }

  /**
   * Get teacher attendance summary for a date range
   * @param {string} schoolId - School ID
   * @param {string} teacherId - Teacher ID
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} - Teacher attendance summary
   */
  static async getTeacherAttendanceSummary(schoolId, teacherId, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const results = [];

      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const snapshot = await rtdb.ref(`${this.ATTENDANCE_REF(schoolId, dateStr)}/${teacherId}`).once('value');

        if (snapshot.exists()) {
          const data = snapshot.val();
          // Check if it's a holiday
          const holidayCheck = await rtdb.ref(this.ATTENDANCE_REF(schoolId, dateStr)).once('value');
          const holidayData = holidayCheck.val();
          if (holidayData && holidayData.isHoliday === true) {
            results.push({
              date: dateStr,
              status: 'holiday',
              reason: holidayData.reason || 'Holiday'
            });
          } else {
            results.push({
              date: dateStr,
              status: data.status,
              ...data
            });
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalDays = results.length;
      const presentDays = results.filter(r => r.status === 'present').length;
      const absentDays = results.filter(r => r.status === 'absent').length;
      const holidayDays = results.filter(r => r.status === 'holiday').length;

      return {
        teacherId,
        startDate,
        endDate,
        totalDays,
        presentDays,
        absentDays,
        holidayDays,
        attendancePercentage: totalDays > 0 ? Math.round((presentDays / (totalDays - holidayDays)) * 100) : 0,
        records: results
      };
    } catch (err) {
      console.error('Get teacher attendance summary error:', err);
      return null;
    }
  }

  /**
   * Get attendance by teacher
   * @param {string} schoolId - School ID
   * @param {string} teacherId - Teacher ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} - Teacher attendance record
   */
  static async getAttendanceByTeacher(schoolId, teacherId, date) {
    try {
      const snapshot = await rtdb.ref(`${this.ATTENDANCE_REF(schoolId, date)}/${teacherId}`).once('value');

      if (!snapshot.exists()) {
        return null;
      }

      return {
        teacherId,
        ...snapshot.val()
      };
    } catch (err) {
      console.error('Get teacher attendance by teacher error:', err);
      return null;
    }
  }

  /**
   * Delete attendance for a specific teacher on a date
   * @param {string} schoolId - School ID
   * @param {string} teacherId - Teacher ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<{success: boolean}>}
   */
  static async deleteTeacherAttendance(schoolId, teacherId, date) {
    try {
      await rtdb.ref(`${this.ATTENDANCE_REF(schoolId, date)}/${teacherId}`).remove();
      return { success: true };
    } catch (err) {
      console.error('Delete teacher attendance error:', err);
      return { success: false, message: err.message };
    }
  }

}

module.exports = TeacherModel;