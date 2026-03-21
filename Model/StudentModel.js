const { admin, rtdb } = require('../Config/firebaseAdmin');

class StudentModel {
  static STUDENTS_REF = (schoolId) => `schools/${schoolId}/students`;
  static COUNTERS_REF = (schoolId) => `counters/schools/${schoolId}/studentCounter`;

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

      // Unique admissionNo check per school
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

      // Remove client-side temporary id
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

  // === Fees Installment CRUD (mirrors FeesInstallment.jsx logic) ===
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
      String(inst.id) === String(installmentId)   // ← very important: string comparison!
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

    // Very important: convert to string for comparison
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

  // === Marks (full marks object replace – matches Marks.jsx) ===
  
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
  // In StudentModel.js - update the addExam method

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

    // Instead of using dot notation in the path, create a proper update object
    const updates = {
      'marks': {
        ...currentMarks,
        exams: updatedExams,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      },
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    // Use set/update without dot notation in paths
    await studentRef.update(updates);

    return { success: true, exam: newExam };
  } catch (err) {
    console.error('Add exam error:', err);
    return { success: false, message: err.message };
  }
}

  // In StudentModel.js - update the deleteExam method

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

  // In StudentModel.js - update the updateMarks method

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
 * @param {Object} criteria - { name?, admissionNo?, grade?, section?, fatherName?, motherName?, aadhar?, ... }
 * @returns {Promise<Array>} matching students
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

      // Add more fields as needed (dob, city, bloodGroup, phone, etc.)

      if (matchesName && matchesAdmissionNo && matchesGrade && 
          matchesSection && matchesFather && matchesMother && matchesAadhar) {
        results.push(student);
      }
    });

    // Sort by name (optional)
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
// In StudentModel.js - Add these methods

  // === Assessment Reports ===
  
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
   * Add a new assessment category (e.g., Reading, Writing, Communication)
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
      
      // Also remove assessments for this category
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
}

module.exports = StudentModel;