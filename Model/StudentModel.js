const { admin, rtdb } = require('../Config/firebaseAdmin');

class StudentModel {
  static STUDENTS_REF = (schoolId) => `schools/${schoolId}/students`;
  static COUNTERS_REF = (schoolId) => `counters/schools/${schoolId}/studentCounter`;



  static ATTENDANCE_REF = (schoolId, date) => 
    `schools/${schoolId}/attendance/${date}`;

  // /**
  //  * Get attendance for a specific date and class
  //  * @param {string} schoolId - School ID
  //  * @param {string} date - Date in YYYY-MM-DD format
  //  * @param {string} classFilter - Class filter (e.g., "10-A" or "all")
  //  * @returns {Promise<Array>} - Array of attendance records
  //  */
  // static async getAttendance(schoolId, date, classFilter = 'all') {
  //   try {
  //     const snapshot = await rtdb.ref(this.ATTENDANCE_REF(schoolId, date)).once('value');
      
  //     if (!snapshot.exists()) {
  //       return [];
  //     }

  //     const records = [];
  //     snapshot.forEach(child => {
  //       const record = { id: child.key, ...child.val() };
  //       // Apply class filter if not 'all'
  //       if (classFilter === 'all' || record.class === classFilter) {
  //         records.push(record);
  //       }
  //     });

  //     return records;
  //   } catch (err) {
  //     console.error('Get attendance error:', err);
  //     return [];
  //   }
  // }

  // /**
  //  * Save attendance records for a date
  //  * @param {string} schoolId - School ID
  //  * @param {Object} attendanceData - { date, records: [{ studentId, status, class }] }
  //  * @returns {Promise<{success: boolean, count: number}>}
  //  */
  // static async saveAttendance(schoolId, attendanceData) {
  //   try {
  //     const { date, records } = attendanceData;
      
  //     if (!date || !records || !Array.isArray(records) || records.length === 0) {
  //       throw new Error('Invalid attendance data');
  //     }

  //     const ref = rtdb.ref(this.ATTENDANCE_REF(schoolId, date));
      
  //     // Prepare data for batch update
  //     const updates = {};
  //     records.forEach(record => {
  //       if (!record.studentId || !record.status) {
  //         throw new Error('Each record must have studentId and status');
  //       }
  //       updates[record.studentId] = {
  //         studentId: record.studentId,
  //         status: record.status,
  //         class: record.class || '',
  //         date: date,
  //         updatedAt: admin.database.ServerValue.TIMESTAMP
  //       };
  //     });

  //     await ref.update(updates);
      
  //     return { 
  //       success: true, 
  //       count: records.length,
  //       message: `Attendance saved for ${records.length} students`
  //     };
  //   } catch (err) {
  //     console.error('Save attendance error:', err);
  //     return { success: false, message: err.message };
  //   }
  // }

  /**
   * Get attendance summary for a student
   * @param {string} schoolId - School ID
   * @param {string} studentId - Student ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} - Attendance summary
   */
  static async getStudentAttendanceSummary(schoolId, studentId, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const results = [];

      // Iterate through each day in the range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const snapshot = await rtdb.ref(`${this.ATTENDANCE_REF(schoolId, dateStr)}/${studentId}`).once('value');
        
        if (snapshot.exists()) {
          results.push({
            date: dateStr,
            status: snapshot.val().status,
            ...snapshot.val()
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalDays = results.length;
      const presentDays = results.filter(r => r.status === 'present').length;
      const absentDays = results.filter(r => r.status === 'absent').length;

      return {
        studentId,
        startDate,
        endDate,
        totalDays,
        presentDays,
        absentDays,
        attendancePercentage: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
        records: results
      };
    } catch (err) {
      console.error('Get student attendance summary error:', err);
      return null;
    }
  }

  /**
   * Get attendance report for a class
   * @param {string} schoolId - School ID
   * @param {string} classId - Class identifier
   * @param {string} month - Month (YYYY-MM)
   * @returns {Promise<Object>} - Class attendance report
   */
  static async getClassAttendanceReport(schoolId, classId, month) {
    try {
      const [year, monthNum] = month.split('-').map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      
      // Get all students in the class
      const studentsSnapshot = await rtdb.ref(this.STUDENTS_REF(schoolId))
        .orderByChild('basicInfo/grade')
        .equalTo(classId)
        .once('value');
      
      const students = [];
      studentsSnapshot.forEach(child => {
        students.push({ studentId: child.key, ...child.val() });
      });

      if (students.length === 0) {
        return { classId, month, students: [], summary: { totalStudents: 0, totalPresent: 0, totalAbsent: 0 } };
      }

      const attendanceData = {};
      
      // Get attendance for each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const snapshot = await rtdb.ref(this.ATTENDANCE_REF(schoolId, dateStr)).once('value');
        
        if (snapshot.exists()) {
          const dayRecords = snapshot.val();
          Object.keys(dayRecords).forEach(studentId => {
            if (!attendanceData[studentId]) {
              attendanceData[studentId] = { present: 0, absent: 0, total: 0 };
            }
            const status = dayRecords[studentId].status;
            if (status === 'present') {
              attendanceData[studentId].present++;
            } else if (status === 'absent') {
              attendanceData[studentId].absent++;
            }
            attendanceData[studentId].total++;
          });
        }
      }

      // Build student reports
      const studentReports = students.map(student => {
        const stats = attendanceData[student.studentId] || { present: 0, absent: 0, total: 0 };
        return {
          studentId: student.studentId,
          studentName: student.basicInfo?.name || 'Unknown',
          rollNumber: student.basicInfo?.admissionNo || student.rollNumber || '-',
          presentDays: stats.present,
          absentDays: stats.absent,
          totalDays: stats.total,
          attendancePercentage: stats.total > 0 ? (stats.present / stats.total) * 100 : 0
        };
      });

      const totalPresent = studentReports.reduce((sum, s) => sum + s.presentDays, 0);
      const totalAbsent = studentReports.reduce((sum, s) => sum + s.absentDays, 0);
      const totalDays = studentReports.reduce((sum, s) => sum + s.totalDays, 0);

      return {
        classId,
        month,
        students: studentReports,
        summary: {
          totalStudents: students.length,
          totalPresent,
          totalAbsent,
          totalDays,
          overallAttendancePercentage: totalDays > 0 ? (totalPresent / totalDays) * 100 : 0
        }
      };
    } catch (err) {
      console.error('Get class attendance report error:', err);
      return null;
    }
  }

  /**
   * Get monthly attendance statistics
   * @param {string} schoolId - School ID
   * @param {string} month - Month (YYYY-MM)
   * @param {string} classFilter - Optional class filter
   * @returns {Promise<Object>} - Monthly statistics
   */
  static async getMonthlyAttendanceStats(schoolId, month, classFilter = 'all') {
    try {
      const [year, monthNum] = month.split('-').map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      
      let totalStudents = 0;
      let totalPresent = 0;
      let totalAbsent = 0;
      let dailyStats = [];

      // Get all students (filtered by class if needed)
      let studentsSnapshot;
      if (classFilter !== 'all') {
        studentsSnapshot = await rtdb.ref(this.STUDENTS_REF(schoolId))
          .orderByChild('basicInfo/grade')
          .equalTo(classFilter)
          .once('value');
      } else {
        studentsSnapshot = await rtdb.ref(this.STUDENTS_REF(schoolId)).once('value');
      }
      
      if (studentsSnapshot.exists()) {
        studentsSnapshot.forEach(() => totalStudents++);
      }

      // Get daily attendance
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const snapshot = await rtdb.ref(this.ATTENDANCE_REF(schoolId, dateStr)).once('value');
        
        let dayPresent = 0;
        let dayAbsent = 0;
        
        if (snapshot.exists()) {
          const records = snapshot.val();
          Object.values(records).forEach(record => {
            if (classFilter === 'all' || record.class === classFilter) {
              if (record.status === 'present') dayPresent++;
              else if (record.status === 'absent') dayAbsent++;
            }
          });
        }
        
        dailyStats.push({
          date: dateStr,
          present: dayPresent,
          absent: dayAbsent,
          total: dayPresent + dayAbsent
        });
        
        totalPresent += dayPresent;
        totalAbsent += dayAbsent;
      }

      return {
        month,
        classFilter,
        totalStudents,
        totalPresent,
        totalAbsent,
        totalAttendanceDays: daysInMonth,
        averageDailyAttendance: totalStudents > 0 ? (totalPresent / (totalStudents * daysInMonth)) * 100 : 0,
        dailyStats
      };
    } catch (err) {
      console.error('Get monthly attendance stats error:', err);
      return null;
    }
  }

  /**
   * Bulk mark attendance for multiple students
   * @param {string} schoolId - School ID
   * @param {Object} bulkData - { date, class, attendance: [{ studentId, status }] }
   * @returns {Promise<{success: boolean, count: number}>}
   */
  static async bulkMarkAttendance(schoolId, bulkData) {
    try {
      const { date, attendance } = bulkData;
      
      if (!date || !attendance || !Array.isArray(attendance) || attendance.length === 0) {
        throw new Error('Invalid bulk attendance data');
      }

      const ref = rtdb.ref(this.ATTENDANCE_REF(schoolId, date));
      const updates = {};
      
      attendance.forEach(record => {
        if (!record.studentId || !record.status) {
          throw new Error('Each record must have studentId and status');
        }
        updates[record.studentId] = {
          studentId: record.studentId,
          status: record.status,
          class: bulkData.class || '',
          date: date,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        };
      });

      await ref.update(updates);
      
      return { 
        success: true, 
        count: attendance.length,
        message: `Bulk attendance marked for ${attendance.length} students`
      };
    } catch (err) {
      console.error('Bulk mark attendance error:', err);
      return { success: false, message: err.message };
    }
  }
  
  /**
   * Generate sequential student ID per school: STU0001, STU0002, ...
   */
  static async generateStudentId(schoolId) {
    const counterRef = rtdb.ref(this.COUNTERS_REF(schoolId));
    const result = await counterRef.transaction(
      (current) => (current || 0) + 1,
      (error, committed, snapshot) => {
        if (error) throw error;
        if (!committed) throw new Error('Transaction failed - counter not committed');
        return snapshot.val();
      }
    );
    const counterValue = result.snapshot.val();
    return `STU${String(counterValue).padStart(4, '0')}`;
  }

  static async createStudent(schoolId, studentData) {
    try {
      const admissionNo = studentData.basicInfo?.admissionNo?.trim();
      if (!admissionNo) throw new Error('Admission number is required');

      const existingSnap = await rtdb.ref(this.STUDENTS_REF(schoolId))
        .orderByChild('basicInfo/admissionNo')
        .equalTo(admissionNo)
        .once('value');
      if (existingSnap.exists()) {
        throw new Error('Admission number already exists in this school');
      }

      const studentId = await this.generateStudentId(schoolId);

      const fullStudent = {
        ...studentData,
        studentId,
        schoolId,
        basicInfo: {
          ...studentData.basicInfo,
          admissionNo,
        },
        createdAt: admin.database.ServerValue.TIMESTAMP,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
        status: 'active',
        totalPaid: studentData.totalPaid || 0,
        pendingAmount: studentData.pendingAmount || studentData.feeStructure?.total || 0,
      };

      delete fullStudent.id;

      await rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`).set(fullStudent);

      return { success: true, studentId, student: fullStudent };
    } catch (error) {
      console.error('Create student error:', error);
      return { success: false, error: error.message || 'internal-error' };
    }
  }

  static async listStudents(schoolId) {
    try {
      const snapshot = await rtdb.ref(this.STUDENTS_REF(schoolId)).once('value');
      if (!snapshot.exists()) return [];
      const students = [];
      snapshot.forEach((child) => {
        students.push({ studentId: child.key, ...child.val() });
      });
      students.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return students;
    } catch (err) {
      console.error('List students error:', err);
      throw err;
    }
  }

  static async getStudent(schoolId, studentId) {
    try {
      const snapshot = await rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`).once('value');
      return snapshot.val() || null;
    } catch (err) {
      console.error('Get student error:', err);
      return null;
    }
  }

  static async updateStudent(schoolId, studentId, updates) {
    try {
      updates.updatedAt = admin.database.ServerValue.TIMESTAMP;
      await rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`).update(updates);
      return { success: true };
    } catch (err) {
      console.error('Update student error:', err);
      return { success: false, message: err.message };
    }
  }

  static async deleteStudent(schoolId, studentId) {
    try {
      await rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`).remove();
      return { success: true };
    } catch (err) {
      console.error('Delete student error:', err);
      return { success: false, message: err.message };
    }
  }

  // === Fees Installment  ===
  static async addInstallment(schoolId, studentId, installmentData) {
    try {
      const ref = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snap = await ref.once('value');
      const student = snap.val();
      if (!student) throw new Error('Student not found');

      const installments = student.installments || [];
      const newInstallment = {
        id: installmentData.id || Date.now(),
        number: installments.length + 1,
        amount: installmentData.amount || 0,
        paid: 0,
        dueDate: installmentData.dueDate || '',
        paidDate: '',
        status: 'pending',
        paymentMode: installmentData.paymentMode || '',
        notes: installmentData.notes || '',
        ...installmentData,
      };
      installments.push(newInstallment);

      const totalPaid = installments.reduce((sum, i) => sum + (i.paid || 0), 0);
      const pendingAmount = (student.feeStructure?.total || 0) - totalPaid;

      await ref.update({
        installments,
        totalPaid,
        pendingAmount,
        status: pendingAmount === 0 ? 'completed' : student.status || 'active',
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      return { success: true, installment: newInstallment };
    } catch (err) {
      console.error('Add installment error:', err);
      return { success: false, message: err.message };
    }
  }

  static async updateInstallment(schoolId, studentId, installmentId, updates) {
  try {
    console.log(`[MODEL] Updating installment ${installmentId} for student ${studentId} in school ${schoolId}`);
    console.log("  updates:", updates);

    const ref = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
    const snap = await ref.once('value');
    const student = snap.val();

    if (!student) {
      console.log("→ Student not found");
      throw new Error('Student not found');
    }

    console.log("  Current installments count:", student.installments?.length || 0);

    const installments = (student.installments || []).map(inst =>
      String(inst.id) === String(installmentId)   
        ? { ...inst, ...updates }
        : inst
    );

    console.log("  After update count still:", installments.length);

    const totalPaid = installments.reduce((sum, i) => sum + (i.paid || 0), 0);
    const pendingAmount = (student.feeStructure?.total || 0) - totalPaid;

    await ref.update({
      installments,
      totalPaid,
      pendingAmount,
      status: pendingAmount === 0 ? 'completed' : student.status || 'active',
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });

    console.log("→ Update successful");
    return { success: true };
  } catch (err) {
    console.error("[MODEL ERROR]", err);
    return { success: false, message: err.message };
  }
}

  static async deleteInstallment(schoolId, studentId, installmentId) {
  try {
    console.log(`[MODEL DELETE] student ${studentId} - removing installment ${installmentId}`);

    const ref = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
    const snap = await ref.once('value');
    const student = snap.val();

    if (!student) {
      console.log("→ Student not found");
      throw new Error('Student not found');
    }

    const originalCount = student.installments?.length || 0;
    console.log("  Before delete - count:", originalCount);

    let installments = (student.installments || []).filter(inst => 
      String(inst.id) !== String(installmentId)
    );

    console.log("  After filter - count:", installments.length);

    if (installments.length === originalCount) {
      console.warn("→ No installment was removed - ID not found");
    }

    installments = installments.map((inst, idx) => ({ ...inst, number: idx + 1 }));

    const totalPaid = installments.reduce((sum, i) => sum + (i.paid || 0), 0);
    const pendingAmount = (student.feeStructure?.total || 0) - totalPaid;

    await ref.update({
      installments,
      totalPaid,
      pendingAmount,
      status: pendingAmount === 0 ? 'completed' : student.status || 'active',
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });

    console.log("→ Delete successful");
    return { success: true };
  } catch (err) {
    console.error("[MODEL DELETE ERROR]", err);
    return { success: false, message: err.message };
  }
}

  // === Marks ===
  
  static async getMarks(schoolId, studentId) {
    try {
      const snapshot = await rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}/marks`).once('value');
      const marks = snapshot.val();
      return marks || null;
    } catch (err) {
      console.error('Get marks error:', err);
      return null;
    }
  }

  /**
   * Append a new exam to student's marks.exams array
   * @param {string} schoolId
   * @param {string} studentId
   * @param {object} examData – the new exam object (without id – will be generated)
   */

static async addExam(schoolId, studentId, examData) {
  try {
    const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
    const snapshot = await studentRef.once('value');
    const student = snapshot.val();

    if (!student) {
      throw new Error('Student not found');
    }

    const currentMarks = student.marks || {};
    const currentExams = currentMarks.exams || [];
    
    const newExam = {
      id: Date.now().toString(),
      ...examData,
      subjects: examData.subjects || [],
    };

    const updatedExams = [...currentExams, newExam];

    const updates = {
      'marks': {
        ...currentMarks,
        exams: updatedExams,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      },
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    await studentRef.update(updates);

    return { success: true, exam: newExam };
  } catch (err) {
    console.error('Add exam error:', err);
    return { success: false, message: err.message };
  }
}


static async deleteExam(schoolId, studentId, examId) {
  try {
    const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
    const snapshot = await studentRef.once('value');
    const student = snapshot.val();

    if (!student) {
      throw new Error('Student not found');
    }

    const currentMarks = student.marks || {};
    const currentExams = currentMarks.exams || [];
    const updatedExams = currentExams.filter(exam => String(exam.id) !== String(examId));

    if (updatedExams.length === currentExams.length) {
      return { success: false, message: 'Exam not found' };
    }

    const updates = {
      'marks': {
        ...currentMarks,
        exams: updatedExams,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      },
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    await studentRef.update(updates);

    return { success: true };
  } catch (err) {
    console.error('Delete exam error:', err);
    return { success: false, message: err.message };
  }
}


static async updateMarks(schoolId, studentId, marksData) {
  try {
    const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
    
    const updates = {
      'marks': {
        ...marksData,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      },
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };
    
    await studentRef.update(updates);
    return { success: true };
  } catch (err) {
    console.error('Update marks error:', err);
    return { success: false, message: err.message };
  }
}
/**
 * Search students by multiple optional criteria
 * @param {string} schoolId
 * @param {Object} criteria 
 * @returns {Promise<Array>} 
 */
static async searchStudents(schoolId, criteria = {}) {
  try {
    const ref = rtdb.ref(this.STUDENTS_REF(schoolId));
    const snapshot = await ref.once('value');

    if (!snapshot.exists()) {
      return [];
    }

    const results = [];

    snapshot.forEach(child => {
      const student = {
        studentId: child.key,
        ...child.val()
      };

      const basic = student.basicInfo || {};

      // Case-insensitive partial match for strings
      const matchesName = !criteria.name || 
        basic.name?.toLowerCase().includes(criteria.name.toLowerCase());

      const matchesAdmissionNo = !criteria.admissionNo || 
        basic.admissionNo === criteria.admissionNo;

      const matchesGrade = !criteria.grade || 
        basic.grade === criteria.grade;

      const matchesSection = !criteria.section || 
        basic.section?.toLowerCase() === criteria.section.toLowerCase();

      const matchesFather = !criteria.fatherName || 
        basic.fatherName?.toLowerCase().includes(criteria.fatherName.toLowerCase());

      const matchesMother = !criteria.motherName || 
        basic.motherName?.toLowerCase().includes(criteria.motherName.toLowerCase());

      const matchesAadhar = !criteria.aadhar || 
        basic.aadhar === criteria.aadhar;


      if (matchesName && matchesAdmissionNo && matchesGrade && 
          matchesSection && matchesFather && matchesMother && matchesAadhar) {
        results.push(student);
      }
    });

    results.sort((a, b) => {
      const nameA = a.basicInfo?.name?.toLowerCase() || '';
      const nameB = b.basicInfo?.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });

    return results;
  } catch (err) {
    console.error('Search students error:', err);
    throw err;
  }
}
  
  /**
   * Get all assessments for a student
   */
  static async getAssessments(schoolId, studentId) {
    try {
      const snapshot = await rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}/assessments`).once('value');
      return snapshot.val() || { categories: [], assessments: [] };
    } catch (err) {
      console.error('Get assessments error:', err);
      return null;
    }
  }

  /**
   * Add a new assessment category 
   */
  static async addAssessmentCategory(schoolId, studentId, categoryData) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();

      if (!student) {
        throw new Error('Student not found');
      }

      const currentAssessments = student.assessments || { categories: [], assessments: [] };
      const categories = currentAssessments.categories || [];
      
      const newCategory = {
        id: Date.now().toString(),
        name: categoryData.name,
        description: categoryData.description || '',
        weightage: categoryData.weightage || 100,
        createdAt: admin.database.ServerValue.TIMESTAMP
      };

      const updatedCategories = [...categories, newCategory];

      const updates = {
        'assessments': {
          ...currentAssessments,
          categories: updatedCategories,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };

      await studentRef.update(updates);

      return { success: true, category: newCategory };
    } catch (err) {
      console.error('Add assessment category error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Update an assessment category
   */
  static async updateAssessmentCategory(schoolId, studentId, categoryId, updates) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();

      if (!student) {
        throw new Error('Student not found');
      }

      const currentAssessments = student.assessments || { categories: [], assessments: [] };
      const categories = (currentAssessments.categories || []).map(cat =>
        String(cat.id) === String(categoryId) ? { ...cat, ...updates } : cat
      );

      const updatesObj = {
        'assessments': {
          ...currentAssessments,
          categories,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };

      await studentRef.update(updatesObj);

      return { success: true };
    } catch (err) {
      console.error('Update assessment category error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Delete an assessment category
   */
  static async deleteAssessmentCategory(schoolId, studentId, categoryId) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();

      if (!student) {
        throw new Error('Student not found');
      }

      const currentAssessments = student.assessments || { categories: [], assessments: [] };
      const categories = (currentAssessments.categories || []).filter(cat => String(cat.id) !== String(categoryId));
      
      const assessments = (currentAssessments.assessments || []).filter(
        assessment => String(assessment.categoryId) !== String(categoryId)
      );

      const updatesObj = {
        'assessments': {
          categories,
          assessments,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };

      await studentRef.update(updatesObj);

      return { success: true };
    } catch (err) {
      console.error('Delete assessment category error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Add an assessment record for a student
   */
  static async addAssessment(schoolId, studentId, assessmentData) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();

      if (!student) {
        throw new Error('Student not found');
      }

      const currentAssessments = student.assessments || { categories: [], assessments: [] };
      const assessments = currentAssessments.assessments || [];
      
      const newAssessment = {
        id: Date.now().toString(),
        ...assessmentData,
        createdAt: admin.database.ServerValue.TIMESTAMP
      };

      const updatedAssessments = [...assessments, newAssessment];

      const updatesObj = {
        'assessments': {
          ...currentAssessments,
          assessments: updatedAssessments,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };

      await studentRef.update(updatesObj);

      return { success: true, assessment: newAssessment };
    } catch (err) {
      console.error('Add assessment error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Update an assessment record
   */
  static async updateAssessment(schoolId, studentId, assessmentId, updates) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();

      if (!student) {
        throw new Error('Student not found');
      }

      const currentAssessments = student.assessments || { categories: [], assessments: [] };
      const assessments = (currentAssessments.assessments || []).map(assessment =>
        String(assessment.id) === String(assessmentId) ? { ...assessment, ...updates } : assessment
      );

      const updatesObj = {
        'assessments': {
          ...currentAssessments,
          assessments,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };

      await studentRef.update(updatesObj);

      return { success: true };
    } catch (err) {
      console.error('Update assessment error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Delete an assessment record
   */
  static async deleteAssessment(schoolId, studentId, assessmentId) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();

      if (!student) {
        throw new Error('Student not found');
      }

      const currentAssessments = student.assessments || { categories: [], assessments: [] };
      const assessments = (currentAssessments.assessments || []).filter(
        assessment => String(assessment.id) !== String(assessmentId)
      );

      const updatesObj = {
        'assessments': {
          ...currentAssessments,
          assessments,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };

      await studentRef.update(updatesObj);

      return { success: true };
    } catch (err) {
      console.error('Delete assessment error:', err);
      return { success: false, message: err.message };
    }
  }

   /**
   * Create a new class exam template
   */
  // Model/StudentModel.js - Update the createClassExam method

static async createClassExam(schoolId, grade, section, examData) {
  try {
    // Generate a unique ID using timestamp + random string
    const examId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const examRef = rtdb.ref(
      `schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}`
    );
    
    const newExam = {
      id: examId,  // Use the generated unique ID
      examType: examData.examType,
      examDate: examData.examDate,
      subjects: examData.subjects || [],
      createdAt: admin.database.ServerValue.TIMESTAMP,
      marks: {} // Will store per-student marks
    };

    await examRef.set(newExam);
    
    return { success: true, examId, exam: newExam };
  } catch (err) {
    console.error('Create class exam error:', err);
    return { success: false, message: err.message };
  }
}

  /**
   * Get all class exams for a specific class
   */
  static async getClassExams(schoolId, grade, section) {
    try {
      const snapshot = await rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/exams`
      ).once('value');
      
      if (!snapshot.exists()) return [];
      
      const exams = [];
      snapshot.forEach(child => {
        exams.push({ id: child.key, ...child.val() });
      });
      
      return exams;
    } catch (err) {
      console.error('Get class exams error:', err);
      return [];
    }
  }

  /**
   * Update student marks for a specific class exam
   */
  static async updateStudentClassExamMarks(
    schoolId, 
    grade, 
    section, 
    examId, 
    studentId, 
    marksData
  ) {
    try {
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
      return { success: true };
    } catch (err) {
      console.error('Update class exam marks error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
 * Get class subjects
 */
static async getClassSubjects(schoolId, grade, section) {
  try {
    const snapshot = await rtdb.ref(
      `schools/${schoolId}/classExams/${grade}-${section}/subjects`
    ).once('value');
    
    if (!snapshot.exists()) return [];
    
    const subjects = snapshot.val();
    // If it's an object with numeric keys, convert to array
    if (typeof subjects === 'object' && !Array.isArray(subjects)) {
      return Object.values(subjects);
    }
    return Array.isArray(subjects) ? subjects : [];
  } catch (err) {
    console.error('Get class subjects error:', err);
    return [];
  }
}
static async setupClassSubjects(schoolId, grade, section, subjects) {
  try {
    // Store subjects as an array at the path
    await rtdb.ref(
      `schools/${schoolId}/classExams/${grade}-${section}/subjects`
    ).set(subjects);
    
    return { success: true };
  } catch (err) {
    console.error('Setup class subjects error:', err);
    return { success: false, message: err.message };
  }
}
  /**
   * Get student's marks for all class exams
   */
  static async getStudentClassExamMarks(schoolId, grade, section, studentId) {
    try {
      const snapshot = await rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/exams`
      ).once('value');
      
      if (!snapshot.exists()) return [];
      
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
      
      return results;
    } catch (err) {
      console.error('Get student class exam marks error:', err);
      return [];
    }
  }

  /**
   * Delete a class exam
   */
  static async deleteClassExam(schoolId, grade, section, examId) {
    try {
      await rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}`
      ).remove();
      return { success: true };
    } catch (err) {
      console.error('Delete class exam error:', err);
      return { success: false, message: err.message };
    }
  }

  // Model/StudentModel.js

// Add this method to the StudentModel class

/**
 * Migrate exam marks to new subject structure
 * @param {string} schoolId - School ID
 * @param {string} grade - Grade
 * @param {string} section - Section
 * @param {string} examId - Exam ID
 * @param {Array} newSubjects - New subjects array
 * @returns {Promise<Object>} - Result
 */
static async migrateExamMarks(schoolId, grade, section, examId, newSubjects) {
  try {
    const examRef = rtdb.ref(
      `schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}`
    );
    
    const snapshot = await examRef.once('value');
    const exam = snapshot.val();
    
    if (!exam) {
      throw new Error('Exam not found');
    }
    
    const marks = exam.marks || {};
    const updatedMarks = {};
    
    // Create a map of subject names to their new total values
    const subjectMap = {};
    newSubjects.forEach(sub => {
      subjectMap[sub.name] = sub.total;
    });
    
    // Update each student's marks
    for (const [studentId, studentMarks] of Object.entries(marks)) {
      if (studentMarks.marks && Array.isArray(studentMarks.marks)) {
        // Update each subject's total
        const updatedStudentMarks = studentMarks.marks.map(mark => {
          const newTotal = subjectMap[mark.name];
          if (newTotal !== undefined) {
            // Calculate new percentage based on new total
            const marksObtained = mark.marks || 0;
            const percentage = newTotal > 0 ? (marksObtained / newTotal) * 100 : 0;
            
            return {
              ...mark,
              total: newTotal,
              percentage: Math.round(percentage * 10) / 10,
              grade: this.calculateGrade(percentage)
            };
          }
          return mark;
        });
        
        // Recalculate totals
        const totalMarks = updatedStudentMarks.reduce((sum, m) => sum + (m.marks || 0), 0);
        const totalPossible = updatedStudentMarks.reduce((sum, m) => sum + (m.total || 0), 0);
        const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
        
        updatedMarks[studentId] = {
          marks: updatedStudentMarks,
          totalMarks: totalMarks,
          totalPossible: totalPossible,
          percentage: Math.round(percentage * 10) / 10,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        };
      } else {
        // If no marks, just copy the data
        updatedMarks[studentId] = studentMarks;
      }
    }
    
    // Update the exam with new subjects and migrated marks
    await examRef.update({
      subjects: newSubjects,
      marks: updatedMarks,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });
    
    return { success: true };
  } catch (err) {
    console.error('Migrate exam marks error:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Calculate grade based on percentage
 */
static calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  if (percentage > 0) return 'F';
  return 'N/A';
}

// Model/StudentModel.js

// At the top of the file, ensure the ATTENDANCE_REF is correct
static ATTENDANCE_REF = (schoolId, date) => 
  `schools/${schoolId}/attendance/${date}`;

/**
 * Get attendance for a specific date and class - COMPLETELY REWRITTEN
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
      
      console.log(`📥 [MODEL] Processing record for ${studentId}:`, record);
      
      // Skip if not a valid attendance record
      if (!record || typeof record !== 'object') {
        console.warn(`⚠️ [MODEL] Invalid record for student ${studentId}:`, record);
        return;
      }
      
      // Skip if no status
      if (!record.status) {
        console.warn(`⚠️ [MODEL] No status for student ${studentId}:`, record);
        return;
      }
      
      // CRITICAL FIX: Check if the record matches the class filter
      let matchesClass = false;
      
      if (classFilter === 'all') {
        matchesClass = true;
      } else if (classFilter.includes('-')) {
        // Filter is like "UKG-A" or "9-A" - split and compare class AND section
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

/**
 * Save attendance records - FIXED with better debugging
 */
static async saveAttendance(schoolId, attendanceData) {
  try {
    const { date, records } = attendanceData;
    
    console.log(`📤 [MODEL] Saving attendance for school: ${schoolId}, date: ${date}`);
    console.log(`📤 [MODEL] Records count: ${records?.length || 0}`);
    
    if (!date || !records || !Array.isArray(records) || records.length === 0) {
      throw new Error('Invalid attendance data');
    }

    // Get the reference path
    const refPath = this.ATTENDANCE_REF(schoolId, date);
    console.log(`📤 [MODEL] Ref path: ${refPath}`);
    
    const ref = rtdb.ref(refPath);
    
    // Prepare data for batch update
    const updates = {};
    records.forEach((record, index) => {
      if (!record.studentId || !record.status) {
        console.error(`❌ [MODEL] Record ${index} missing studentId or status:`, record);
        throw new Error(`Each record must have studentId and status. Record ${index} is invalid.`);
      }
      
      // CRITICAL FIX: Preserve the exact status
      updates[record.studentId] = {
        studentId: record.studentId,
        status: record.status, // Keep as is - don't transform
        class: record.class || '',
        section: record.section || '',
        date: date,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      };
      
      console.log(`📤 [MODEL] Record ${index}: ${record.studentId} -> ${record.status}`);
    });

    console.log(`📤 [MODEL] Updates object:`, JSON.stringify(updates, null, 2));

    // Write to Firebase
    await ref.update(updates);
    
    console.log(`✅ [MODEL] Saved ${records.length} attendance records for ${date}`);
    
    // CRITICAL FIX: Verify the write by reading back immediately
    const verifySnapshot = await ref.once('value');
    const verifyData = verifySnapshot.val();
    console.log(`📤 [MODEL] Verification read:`, JSON.stringify(verifyData, null, 2));
    
    // Check if the data was actually written
    let savedCount = 0;
    if (verifyData) {
      Object.keys(verifyData).forEach(key => {
        if (verifyData[key] && verifyData[key].status) {
          savedCount++;
        }
      });
    }
    console.log(`📤 [MODEL] Verification: ${savedCount} records found in database`);
    
    return { 
      success: true, 
      count: records.length,
      verified: savedCount,
      message: `Attendance saved for ${records.length} students`
    };
  } catch (err) {
    console.error('❌ [MODEL] Save attendance error:', err);
    return { success: false, message: err.message };
  }
}
}

module.exports = StudentModel;