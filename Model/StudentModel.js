const { admin, rtdb } = require('../Config/firebaseAdmin');

class StudentModel {
  static STUDENTS_REF = (schoolId) => `schools/${schoolId}/students`;
  static COUNTERS_REF = (schoolId) => `counters/schools/${schoolId}/studentCounter`;
  static ATTENDANCE_REF = (schoolId, date) => `schools/${schoolId}/attendance/${date}`;

  // ────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────

  /**
   * Collision-proof exam id generator.
   * Never use bare Date.now() — it collides in the same millisecond.
   */
  static _newExamId() {
    return `exam_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Server-side grade calculation (single source of truth).
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

  /**
   * Recompute student-level rollup from the list of exams.
   * Each exam contributes its OWN totalMarks/totalPossible.
   */
  static _rollupMarks(exams) {
    const totalMarks = exams.reduce((s, e) => s + (Number(e.totalMarks) || 0), 0);
    const totalPossible = exams.reduce((s, e) => s + (Number(e.totalPossible) || 0), 0);
    const averagePercentage =
      totalPossible > 0 ? Math.round((totalMarks / totalPossible) * 1000) / 10 : 0;

    return {
      totalMarks,
      totalPossible,
      averagePercentage,
      overallGrade: this.calculateGrade(averagePercentage),
    };
  }

  /**
   * Normalize subjects and recompute per-exam fields.
   * Returns null if no valid subject.
   */
  static _normalizeExamPayload(examForm) {
    const validSubjects = (examForm.subjects || [])
      .filter(
        (s) =>
          s &&
          typeof s.name === 'string' &&
          s.name.trim() &&
          s.marks !== undefined && s.marks !== '' && s.marks !== null &&
          s.total !== undefined && s.total !== '' && s.total !== null
      )
      .map((s) => {
        const marks = parseFloat(s.marks) || 0;
        const total = parseFloat(s.total) || 0;
        const pct = total > 0 ? (marks / total) * 100 : 0;
        return {
          name: s.name.trim(),
          marks,
          total,
          grade: this.calculateGrade(pct),
        };
      });

    if (validSubjects.length === 0) return null;

    const totalMarks = validSubjects.reduce((sum, s) => sum + s.marks, 0);
    const totalPossible = validSubjects.reduce((sum, s) => sum + s.total, 0);
    const percentage =
      totalPossible > 0 ? Math.round((totalMarks / totalPossible) * 1000) / 10 : 0;

    return {
      examType: (examForm.examType || '').trim(),
      examDate: examForm.examDate || new Date().toISOString().split('T')[0],
      subjects: validSubjects,
      totalMarks,
      totalPossible,
      percentage,
      overallGrade: this.calculateGrade(percentage),
    };
  }

  // ────────────────────────────────────────────────
  // Attendance (unchanged)
  // ────────────────────────────────────────────────

  static async getStudentAttendanceSummary(schoolId, studentId, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const results = [];

      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const snapshot = await rtdb
          .ref(`${this.ATTENDANCE_REF(schoolId, dateStr)}/${studentId}`)
          .once('value');

        if (snapshot.exists()) {
          results.push({
            date: dateStr,
            status: snapshot.val().status,
            ...snapshot.val(),
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalDays = results.length;
      const presentDays = results.filter((r) => r.status === 'present').length;
      const absentDays = results.filter((r) => r.status === 'absent').length;

      return {
        studentId,
        startDate,
        endDate,
        totalDays,
        presentDays,
        absentDays,
        attendancePercentage: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
        records: results,
      };
    } catch (err) {
      console.error('Get student attendance summary error:', err);
      return null;
    }
  }

  static async getClassAttendanceReport(schoolId, classId, month) {
    try {
      const [year, monthNum] = month.split('-').map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();

      const studentsSnapshot = await rtdb
        .ref(this.STUDENTS_REF(schoolId))
        .orderByChild('basicInfo/grade')
        .equalTo(classId)
        .once('value');

      const students = [];
      studentsSnapshot.forEach((child) => {
        students.push({ studentId: child.key, ...child.val() });
      });

      if (students.length === 0) {
        return {
          classId,
          month,
          students: [],
          summary: { totalStudents: 0, totalPresent: 0, totalAbsent: 0 },
        };
      }

      const attendanceData = {};

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const snapshot = await rtdb.ref(this.ATTENDANCE_REF(schoolId, dateStr)).once('value');

        if (snapshot.exists()) {
          const dayRecords = snapshot.val();
          Object.keys(dayRecords).forEach((studentId) => {
            if (!attendanceData[studentId]) {
              attendanceData[studentId] = { present: 0, absent: 0, total: 0 };
            }
            const status = dayRecords[studentId].status;
            if (status === 'present') attendanceData[studentId].present++;
            else if (status === 'absent') attendanceData[studentId].absent++;
            attendanceData[studentId].total++;
          });
        }
      }

      const studentReports = students.map((student) => {
        const stats = attendanceData[student.studentId] || { present: 0, absent: 0, total: 0 };
        return {
          studentId: student.studentId,
          studentName: student.basicInfo?.name || 'Unknown',
          rollNumber: student.basicInfo?.admissionNo || student.rollNumber || '-',
          presentDays: stats.present,
          absentDays: stats.absent,
          totalDays: stats.total,
          attendancePercentage: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
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
          overallAttendancePercentage: totalDays > 0 ? (totalPresent / totalDays) * 100 : 0,
        },
      };
    } catch (err) {
      console.error('Get class attendance report error:', err);
      return null;
    }
  }

  static async getMonthlyAttendanceStats(schoolId, month, classFilter = 'all') {
    try {
      const [year, monthNum] = month.split('-').map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();

      let totalStudents = 0;
      let totalPresent = 0;
      let totalAbsent = 0;
      const dailyStats = [];

      let studentsSnapshot;
      if (classFilter !== 'all') {
        studentsSnapshot = await rtdb
          .ref(this.STUDENTS_REF(schoolId))
          .orderByChild('basicInfo/grade')
          .equalTo(classFilter)
          .once('value');
      } else {
        studentsSnapshot = await rtdb.ref(this.STUDENTS_REF(schoolId)).once('value');
      }

      if (studentsSnapshot.exists()) {
        studentsSnapshot.forEach(() => totalStudents++);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const snapshot = await rtdb.ref(this.ATTENDANCE_REF(schoolId, dateStr)).once('value');

        let dayPresent = 0;
        let dayAbsent = 0;

        if (snapshot.exists()) {
          const records = snapshot.val();
          Object.values(records).forEach((record) => {
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
          total: dayPresent + dayAbsent,
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
        averageDailyAttendance:
          totalStudents > 0 ? (totalPresent / (totalStudents * daysInMonth)) * 100 : 0,
        dailyStats,
      };
    } catch (err) {
      console.error('Get monthly attendance stats error:', err);
      return null;
    }
  }

  static async bulkMarkAttendance(schoolId, bulkData) {
    try {
      const { date, attendance } = bulkData;

      if (!date || !attendance || !Array.isArray(attendance) || attendance.length === 0) {
        throw new Error('Invalid bulk attendance data');
      }

      const ref = rtdb.ref(this.ATTENDANCE_REF(schoolId, date));
      const updates = {};

      attendance.forEach((record) => {
        if (!record.studentId || !record.status) {
          throw new Error('Each record must have studentId and status');
        }
        updates[record.studentId] = {
          studentId: record.studentId,
          status: record.status,
          class: bulkData.class || '',
          date,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
        };
      });

      await ref.update(updates);

      return {
        success: true,
        count: attendance.length,
        message: `Bulk attendance marked for ${attendance.length} students`,
      };
    } catch (err) {
      console.error('Bulk mark attendance error:', err);
      return { success: false, message: err.message };
    }
  }

  // ────────────────────────────────────────────────
  // Student CRUD (unchanged)
  // ────────────────────────────────────────────────

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

      const existingSnap = await rtdb
        .ref(this.STUDENTS_REF(schoolId))
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
      const snapshot = await rtdb
        .ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`)
        .once('value');
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

  // ────────────────────────────────────────────────
  // Fees Installments (unchanged)
  // ────────────────────────────────────────────────

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
      const ref = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snap = await ref.once('value');
      const student = snap.val();
      if (!student) throw new Error('Student not found');

      const installments = (student.installments || []).map((inst) =>
        String(inst.id) === String(installmentId) ? { ...inst, ...updates } : inst
      );

      const totalPaid = installments.reduce((sum, i) => sum + (i.paid || 0), 0);
      const pendingAmount = (student.feeStructure?.total || 0) - totalPaid;

      await ref.update({
        installments,
        totalPaid,
        pendingAmount,
        status: pendingAmount === 0 ? 'completed' : student.status || 'active',
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      return { success: true };
    } catch (err) {
      console.error('[MODEL ERROR]', err);
      return { success: false, message: err.message };
    }
  }

  static async deleteInstallment(schoolId, studentId, installmentId) {
    try {
      const ref = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snap = await ref.once('value');
      const student = snap.val();
      if (!student) throw new Error('Student not found');

      let installments = (student.installments || []).filter(
        (inst) => String(inst.id) !== String(installmentId)
      );
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

      return { success: true };
    } catch (err) {
      console.error('[MODEL DELETE ERROR]', err);
      return { success: false, message: err.message };
    }
  }

  // ────────────────────────────────────────────────
  // Marks  ⭐ ALL REWRITTEN
  // ────────────────────────────────────────────────

  static async getMarks(schoolId, studentId) {
    try {
      const snapshot = await rtdb
        .ref(`${this.STUDENTS_REF(schoolId)}/${studentId}/marks`)
        .once('value');
      return snapshot.val() || null;
    } catch (err) {
      console.error('Get marks error:', err);
      return null;
    }
  }

  /**
   * Append a new exam to student's marks.exams array.
   * - Uses collision-proof exam id.
   * - Normalizes subjects + recomputes per-exam totals server-side.
   * - Recomputes student-level rollup.
   */
  static async addExam(schoolId, studentId, examData) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();

      if (!student) throw new Error('Student not found');

      const normalized = this._normalizeExamPayload(examData);
      if (!normalized) {
        return { success: false, message: 'No valid subjects provided' };
      }

      const currentMarks = student.marks || {};
      const currentExams = currentMarks.exams || [];

      const newExam = {
        id: this._newExamId(),
        ...normalized,
      };

      const updatedExams = [...currentExams, newExam];
      const rollup = this._rollupMarks(updatedExams);

      await studentRef.update({
        marks: {
          ...currentMarks,
          exams: updatedExams,
          ...rollup,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

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

      if (!student) throw new Error('Student not found');

      const currentMarks = student.marks || {};
      const currentExams = currentMarks.exams || [];
      const updatedExams = currentExams.filter(
        (exam) => String(exam.id) !== String(examId)
      );

      if (updatedExams.length === currentExams.length) {
        return { success: false, message: 'Exam not found' };
      }

      const rollup = this._rollupMarks(updatedExams);

      await studentRef.update({
        marks: {
          ...currentMarks,
          exams: updatedExams,
          ...rollup,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      return { success: true };
    } catch (err) {
      console.error('Delete exam error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Full replacement of marks. Rejects duplicate exam ids.
   * Recomputes per-exam and student-level rollup on server.
   */
  static async updateMarks(schoolId, studentId, marksData) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();
      if (!student) throw new Error('Student not found');

      const incoming = Array.isArray(marksData.exams) ? marksData.exams : [];
      const seen = new Set();
      const cleanedExams = [];

      for (const exam of incoming) {
        const rawId = exam && exam.id ? String(exam.id) : '';
        const id = rawId || this._newExamId();

        if (seen.has(id)) {
          return {
            success: false,
            message:
              `Duplicate exam id "${id}" detected. Refusing to save — this would ` +
              `corrupt both exams. Please fix the duplicate ids first.`,
          };
        }
        seen.add(id);

        // Re-normalize subjects so per-exam totals stay accurate
        const normalized = this._normalizeExamPayload(exam);
        if (!normalized) {
          // Keep exam but flag it
          cleanedExams.push({ ...exam, id });
        } else {
          cleanedExams.push({ ...exam, ...normalized, id });
        }
      }

      const rollup = this._rollupMarks(cleanedExams);

      await studentRef.update({
        marks: {
          ...marksData,
          exams: cleanedExams,
          ...rollup,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      return { success: true, marks: { exams: cleanedExams, ...rollup } };
    } catch (err) {
      console.error('Update marks error:', err);
      return { success: false, message: err.message };
    }
  }

  // ────────────────────────────────────────────────
  // Search / Assessments (unchanged)
  // ────────────────────────────────────────────────

  static async searchStudents(schoolId, criteria = {}) {
    try {
      const ref = rtdb.ref(this.STUDENTS_REF(schoolId));
      const snapshot = await ref.once('value');
      if (!snapshot.exists()) return [];

      const results = [];
      snapshot.forEach((child) => {
        const student = { studentId: child.key, ...child.val() };
        const basic = student.basicInfo || {};

        const matchesName =
          !criteria.name || basic.name?.toLowerCase().includes(criteria.name.toLowerCase());
        const matchesAdmissionNo =
          !criteria.admissionNo || basic.admissionNo === criteria.admissionNo;
        const matchesGrade = !criteria.grade || basic.grade === criteria.grade;
        const matchesSection =
          !criteria.section ||
          basic.section?.toLowerCase() === criteria.section.toLowerCase();
        const matchesFather =
          !criteria.fatherName ||
          basic.fatherName?.toLowerCase().includes(criteria.fatherName.toLowerCase());
        const matchesMother =
          !criteria.motherName ||
          basic.motherName?.toLowerCase().includes(criteria.motherName.toLowerCase());
        const matchesAadhar = !criteria.aadhar || basic.aadhar === criteria.aadhar;

        if (
          matchesName &&
          matchesAdmissionNo &&
          matchesGrade &&
          matchesSection &&
          matchesFather &&
          matchesMother &&
          matchesAadhar
        ) {
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

  static async getAssessments(schoolId, studentId) {
    try {
      const snapshot = await rtdb
        .ref(`${this.STUDENTS_REF(schoolId)}/${studentId}/assessments`)
        .once('value');
      return snapshot.val() || { categories: [], assessments: [] };
    } catch (err) {
      console.error('Get assessments error:', err);
      return null;
    }
  }

  static async addAssessmentCategory(schoolId, studentId, categoryData) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();
      if (!student) throw new Error('Student not found');

      const currentAssessments = student.assessments || {
        categories: [],
        assessments: [],
      };
      const categories = currentAssessments.categories || [];

      const newCategory = {
        id: Date.now().toString(),
        name: categoryData.name,
        description: categoryData.description || '',
        weightage: categoryData.weightage || 100,
        createdAt: admin.database.ServerValue.TIMESTAMP,
      };

      const updatedCategories = [...categories, newCategory];

      await studentRef.update({
        assessments: {
          ...currentAssessments,
          categories: updatedCategories,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      return { success: true, category: newCategory };
    } catch (err) {
      console.error('Add assessment category error:', err);
      return { success: false, message: err.message };
    }
  }

  static async updateAssessmentCategory(schoolId, studentId, categoryId, updates) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();
      if (!student) throw new Error('Student not found');

      const currentAssessments = student.assessments || {
        categories: [],
        assessments: [],
      };
      const categories = (currentAssessments.categories || []).map((cat) =>
        String(cat.id) === String(categoryId) ? { ...cat, ...updates } : cat
      );

      await studentRef.update({
        assessments: {
          ...currentAssessments,
          categories,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      return { success: true };
    } catch (err) {
      console.error('Update assessment category error:', err);
      return { success: false, message: err.message };
    }
  }

  static async deleteAssessmentCategory(schoolId, studentId, categoryId) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();
      if (!student) throw new Error('Student not found');

      const currentAssessments = student.assessments || {
        categories: [],
        assessments: [],
      };
      const categories = (currentAssessments.categories || []).filter(
        (cat) => String(cat.id) !== String(categoryId)
      );
      const assessments = (currentAssessments.assessments || []).filter(
        (a) => String(a.categoryId) !== String(categoryId)
      );

      await studentRef.update({
        assessments: {
          categories,
          assessments,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      return { success: true };
    } catch (err) {
      console.error('Delete assessment category error:', err);
      return { success: false, message: err.message };
    }
  }

  static async addAssessment(schoolId, studentId, assessmentData) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();
      if (!student) throw new Error('Student not found');

      const currentAssessments = student.assessments || {
        categories: [],
        assessments: [],
      };
      const assessments = currentAssessments.assessments || [];

      const newAssessment = {
        id: Date.now().toString(),
        ...assessmentData,
        createdAt: admin.database.ServerValue.TIMESTAMP,
      };

      await studentRef.update({
        assessments: {
          ...currentAssessments,
          assessments: [...assessments, newAssessment],
          updatedAt: admin.database.ServerValue.TIMESTAMP,
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      return { success: true, assessment: newAssessment };
    } catch (err) {
      console.error('Add assessment error:', err);
      return { success: false, message: err.message };
    }
  }

  static async updateAssessment(schoolId, studentId, assessmentId, updates) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();
      if (!student) throw new Error('Student not found');

      const currentAssessments = student.assessments || {
        categories: [],
        assessments: [],
      };
      const assessments = (currentAssessments.assessments || []).map((a) =>
        String(a.id) === String(assessmentId) ? { ...a, ...updates } : a
      );

      await studentRef.update({
        assessments: {
          ...currentAssessments,
          assessments,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      return { success: true };
    } catch (err) {
      console.error('Update assessment error:', err);
      return { success: false, message: err.message };
    }
  }

  static async deleteAssessment(schoolId, studentId, assessmentId) {
    try {
      const studentRef = rtdb.ref(`${this.STUDENTS_REF(schoolId)}/${studentId}`);
      const snapshot = await studentRef.once('value');
      const student = snapshot.val();
      if (!student) throw new Error('Student not found');

      const currentAssessments = student.assessments || {
        categories: [],
        assessments: [],
      };
      const assessments = (currentAssessments.assessments || []).filter(
        (a) => String(a.id) !== String(assessmentId)
      );

      await studentRef.update({
        assessments: {
          ...currentAssessments,
          assessments,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
        },
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      return { success: true };
    } catch (err) {
      console.error('Delete assessment error:', err);
      return { success: false, message: err.message };
    }
  }

  // ────────────────────────────────────────────────
  // Class Exams (unchanged — already correct)
  // ────────────────────────────────────────────────

  static async createClassExam(schoolId, grade, section, examData) {
    try {
      const examId = this._newExamId();

      const examRef = rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}`
      );

      const newExam = {
        id: examId,
        examType: examData.examType,
        examDate: examData.examDate,
        subjects: examData.subjects || [],
        createdAt: admin.database.ServerValue.TIMESTAMP,
        marks: {},
      };

      await examRef.set(newExam);

      return { success: true, examId, exam: newExam };
    } catch (err) {
      console.error('Create class exam error:', err);
      return { success: false, message: err.message };
    }
  }

  static async getClassExams(schoolId, grade, section) {
    try {
      const snapshot = await rtdb
        .ref(`schools/${schoolId}/classExams/${grade}-${section}/exams`)
        .once('value');
      if (!snapshot.exists()) return [];

      const exams = [];
      snapshot.forEach((child) => {
        exams.push({ id: child.key, ...child.val() });
      });
      return exams;
    } catch (err) {
      console.error('Get class exams error:', err);
      return [];
    }
  }

  // ────────────────────────────────────────────────
// Class Exam: edit subjects + per-student marks
// ────────────────────────────────────────────────

/**
 * Get one class exam with its current subjects and per-student marks.
 */
static async getClassExam(schoolId, grade, section, examId) {
  try {
    const snap = await rtdb
      .ref(`schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}`)
      .once('value');
    if (!snap.exists()) return null;
    return { id: examId, ...snap.val() };
  } catch (err) {
    console.error('Get class exam error:', err);
    return null;
  }
}

/**
 * Edit a class exam's subjects (each subject: { name, total }) AND
 * optionally overwrite per-student obtained marks.
 *
 * payload = {
 *   subjects: [{ name: 'Math', total: 100 }, ...],
 *   studentMarks?: { [studentId]: [{ name: 'Math', marks: 78 }, ...] }
 * }
 *
 * Any student not present in studentMarks keeps their existing marks
 * (matched by subject name) — totals get re-baselined to the new subjects.
 */
static async updateClassExamDetails(schoolId, grade, section, examId, payload) {
  try {
    const examRef = rtdb.ref(
      `schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}`
    );
    const snap = await examRef.once('value');
    const exam = snap.val();
    if (!exam) throw new Error('Exam not found');

    // 1) Normalize + validate new subjects
    const rawSubjects = Array.isArray(payload.subjects) ? payload.subjects : [];
    const newSubjects = rawSubjects
      .filter((s) => s && typeof s.name === 'string' && s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        total: Math.max(0, parseFloat(s.total) || 0),
      }));

    if (newSubjects.length === 0) {
      throw new Error('At least one subject with a name is required');
    }

    // Reject duplicate subject names (would collapse marks)
    const nameSet = new Set();
    for (const s of newSubjects) {
      if (nameSet.has(s.name)) {
        throw new Error(`Duplicate subject name: "${s.name}"`);
      }
      nameSet.add(s.name);
    }

    const subjectTotalMap = {};
    newSubjects.forEach((s) => {
      subjectTotalMap[s.name] = s.total;
    });

    // 2) Rebase existing per-student marks to the new subject list
    const existingMarks = exam.marks || {};
    const incomingStudentMarks = payload.studentMarks || {};
    const rebasedMarks = {};

    // Union of student ids we know about (existing + incoming)
    const studentIds = new Set([
      ...Object.keys(existingMarks),
      ...Object.keys(incomingStudentMarks),
    ]);

    for (const studentId of studentIds) {
      const existing = existingMarks[studentId];
      const incoming = incomingStudentMarks[studentId];

      // Build a lookup of obtained marks by subject name
      const obtainedByName = {};

      // Start from existing (so untouched students keep their numbers)
      if (existing && Array.isArray(existing.marks)) {
        existing.marks.forEach((m) => {
          if (m && m.name) {
            obtainedByName[m.name] = parseFloat(m.marks) || 0;
          }
        });
      }

      // Overlay incoming marks (this is what the UI just edited)
      if (Array.isArray(incoming)) {
        incoming.forEach((m) => {
          if (m && m.name) {
            obtainedByName[m.name] = parseFloat(m.marks) || 0;
          }
        });
      }

      // Rebuild in the exact order of newSubjects, with totals from newSubjects
      const rebuiltMarks = newSubjects.map((sub) => {
        const obtained = obtainedByName[sub.name] ?? 0;
        const total = sub.total;
        const pct = total > 0 ? (obtained / total) * 100 : 0;
        return {
          name: sub.name,
          marks: obtained,
          total,
          grade: this.calculateGrade(pct),
        };
      });

      const totalMarks = rebuiltMarks.reduce((s, m) => s + (m.marks || 0), 0);
      const totalPossible = rebuiltMarks.reduce((s, m) => s + (m.total || 0), 0);
      const percentage =
        totalPossible > 0 ? Math.round((totalMarks / totalPossible) * 1000) / 10 : 0;

      rebasedMarks[studentId] = {
        marks: rebuiltMarks,
        totalMarks,
        totalPossible,
        percentage,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      };
    }

    // 3) Write the exam back
    await examRef.update({
      subjects: newSubjects,
      marks: rebasedMarks,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });

    return {
      success: true,
      exam: {
        id: examId,
        ...exam,
        subjects: newSubjects,
        marks: rebasedMarks,
      },
    };
  } catch (err) {
    console.error('Update class exam details error:', err);
    return { success: false, message: err.message };
  }
}

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

      const totalMarks = marksData.reduce((sum, m) => sum + (m.marks || 0), 0);
      const totalPossible = marksData.reduce((sum, m) => sum + (m.total || 0), 0);
      const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;

      const data = {
        marks: marksData,
        totalMarks,
        totalPossible,
        percentage: Math.round(percentage * 10) / 10,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      };

      await ref.set(data);
      return { success: true };
    } catch (err) {
      console.error('Update class exam marks error:', err);
      return { success: false, message: err.message };
    }
  }

  static async getClassSubjects(schoolId, grade, section) {
    try {
      const snapshot = await rtdb
        .ref(`schools/${schoolId}/classExams/${grade}-${section}/subjects`)
        .once('value');
      if (!snapshot.exists()) return [];

      const subjects = snapshot.val();
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
      await rtdb
        .ref(`schools/${schoolId}/classExams/${grade}-${section}/subjects`)
        .set(subjects);
      return { success: true };
    } catch (err) {
      console.error('Setup class subjects error:', err);
      return { success: false, message: err.message };
    }
  }

  static async getStudentClassExamMarks(schoolId, grade, section, studentId) {
    try {
      const snapshot = await rtdb
        .ref(`schools/${schoolId}/classExams/${grade}-${section}/exams`)
        .once('value');
      if (!snapshot.exists()) return [];

      const results = [];
      snapshot.forEach((examChild) => {
        const examId = examChild.key;
        const examData = examChild.val();
        const studentMarks = examData.marks?.[studentId] || null;

        results.push({
          examId,
          examType: examData.examType,
          examDate: examData.examDate,
          subjects: examData.subjects,
          marks: studentMarks,
        });
      });

      return results;
    } catch (err) {
      console.error('Get student class exam marks error:', err);
      return [];
    }
  }

  static async deleteClassExam(schoolId, grade, section, examId) {
    try {
      await rtdb
        .ref(`schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}`)
        .remove();
      return { success: true };
    } catch (err) {
      console.error('Delete class exam error:', err);
      return { success: false, message: err.message };
    }
  }

  static async migrateExamMarks(schoolId, grade, section, examId, newSubjects) {
    try {
      const examRef = rtdb.ref(
        `schools/${schoolId}/classExams/${grade}-${section}/exams/${examId}`
      );

      const snapshot = await examRef.once('value');
      const exam = snapshot.val();
      if (!exam) throw new Error('Exam not found');

      const marks = exam.marks || {};
      const updatedMarks = {};

      const subjectMap = {};
      newSubjects.forEach((sub) => {
        subjectMap[sub.name] = sub.total;
      });

      for (const [studentId, studentMarks] of Object.entries(marks)) {
        if (studentMarks.marks && Array.isArray(studentMarks.marks)) {
          const updatedStudentMarks = studentMarks.marks.map((mark) => {
            const newTotal = subjectMap[mark.name];
            if (newTotal !== undefined) {
              const marksObtained = mark.marks || 0;
              const percentage = newTotal > 0 ? (marksObtained / newTotal) * 100 : 0;
              return {
                ...mark,
                total: newTotal,
                percentage: Math.round(percentage * 10) / 10,
                grade: this.calculateGrade(percentage),
              };
            }
            return mark;
          });

          const totalMarks = updatedStudentMarks.reduce((s, m) => s + (m.marks || 0), 0);
          const totalPossible = updatedStudentMarks.reduce((s, m) => s + (m.total || 0), 0);
          const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;

          updatedMarks[studentId] = {
            marks: updatedStudentMarks,
            totalMarks,
            totalPossible,
            percentage: Math.round(percentage * 10) / 10,
            updatedAt: admin.database.ServerValue.TIMESTAMP,
          };
        } else {
          updatedMarks[studentId] = studentMarks;
        }
      }

      await examRef.update({
        subjects: newSubjects,
        marks: updatedMarks,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
      });

      return { success: true };
    } catch (err) {
      console.error('Migrate exam marks error:', err);
      return { success: false, message: err.message };
    }
  }

  // ────────────────────────────────────────────────
  // Attendance get/save (unchanged)
  // ────────────────────────────────────────────────

  static async getAttendance(schoolId, date, classFilter = 'all') {
    try {
      const refPath = this.ATTENDANCE_REF(schoolId, date);
      const snapshot = await rtdb.ref(refPath).once('value');

      if (!snapshot.exists()) return [];

      const allRecords = snapshot.val();

      if (allRecords.isHoliday === true) {
        return [
          {
            isHoliday: true,
            reason: allRecords.reason || 'Holiday',
            date,
          },
        ];
      }

      const records = [];
      Object.keys(allRecords).forEach((studentId) => {
        const record = allRecords[studentId];
        if (!record || typeof record !== 'object') return;
        if (!record.status) return;

        let matchesClass = false;
        if (classFilter === 'all') {
          matchesClass = true;
        } else if (classFilter.includes('-')) {
          const [filterClass, filterSection] = classFilter.split('-');
          matchesClass = record.class === filterClass && record.section === filterSection;
        } else {
          matchesClass = record.class === classFilter;
        }

        if (matchesClass) {
          records.push({
            studentId,
            status: record.status,
            class: record.class || '',
            section: record.section || '',
            date: record.date || date,
            updatedAt: record.updatedAt || null,
          });
        }
      });

      return records;
    } catch (err) {
      console.error('Get attendance error:', err);
      return [];
    }
  }

  static async saveAttendance(schoolId, attendanceData) {
    try {
      const { date, records } = attendanceData;

      if (!date || !records || !Array.isArray(records) || records.length === 0) {
        throw new Error('Invalid attendance data');
      }

      const ref = rtdb.ref(this.ATTENDANCE_REF(schoolId, date));
      const updates = {};

      records.forEach((record, index) => {
        if (!record.studentId || !record.status) {
          throw new Error(
            `Each record must have studentId and status. Record ${index} is invalid.`
          );
        }
        updates[record.studentId] = {
          studentId: record.studentId,
          status: record.status,
          class: record.class || '',
          section: record.section || '',
          date,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
        };
      });

      await ref.update(updates);

      return {
        success: true,
        count: records.length,
        message: `Attendance saved for ${records.length} students`,
      };
    } catch (err) {
      console.error('Save attendance error:', err);
      return { success: false, message: err.message };
    }
  }
}

module.exports = StudentModel;