// Model/BillingModel.js
const { admin, rtdb } = require('../Config/firebaseAdmin');

class BillingModel {
  static INVOICES_REF = (schoolId) => `schools/${schoolId}/invoices`;
  static INVOICE_COUNTER_REF = (schoolId) => `counters/schools/${schoolId}/invoiceCounter`;
  static PAYMENTS_REF = (schoolId) => `schools/${schoolId}/payments`;

  /**
   * Generate sequential invoice number
   */
  static async generateInvoiceNumber(schoolId) {
    const counterRef = rtdb.ref(this.INVOICE_COUNTER_REF(schoolId));
    const result = await counterRef.transaction(
      (current) => (current || 0) + 1,
      (error, committed, snapshot) => {
        if (error) throw error;
        if (!committed) throw new Error('Transaction failed');
        return snapshot.val();
      }
    );
    const counterValue = result.snapshot.val();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-${String(counterValue).padStart(4, '0')}`;
  }

  /**
   * Create a new invoice
   */
  static async createInvoice(schoolId, invoiceData) {
    try {
      const invoiceNumber = await this.generateInvoiceNumber(schoolId);
      const invoiceId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      // Calculate total
      const total = invoiceData.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
      
      const invoice = {
        id: invoiceId,
        invoiceNumber,
        studentId: invoiceData.studentId,
        studentName: invoiceData.studentName || '',
        studentAdmission: invoiceData.studentAdmission || '',
        studentGrade: invoiceData.studentGrade || '',
        studentSection: invoiceData.studentSection || '',
        studentFather: invoiceData.studentFather || '',
        studentPhone: invoiceData.studentPhone || '',
        items: invoiceData.items.map(item => ({
          description: item.description,
          amount: parseFloat(item.amount) || 0,
          quantity: parseInt(item.quantity) || 1
        })),
        total: parseFloat(total) || 0,
        paidAmount: 0,
        pendingAmount: parseFloat(total) || 0,
        status: 'pending', // pending, partial, paid, overdue, cancelled
        dueDate: invoiceData.dueDate || '',
        notes: invoiceData.notes || '',
        date: invoiceData.date || new Date().toISOString().split('T')[0],
        createdAt: admin.database.ServerValue.TIMESTAMP,
        updatedAt: admin.database.ServerValue.TIMESTAMP,
        payments: []
      };

      await rtdb.ref(`${this.INVOICES_REF(schoolId)}/${invoiceId}`).set(invoice);
      
      // Update student's pending amount
      await this.updateStudentPendingAmount(schoolId, invoiceData.studentId);
      
      return { success: true, invoice, invoiceId };
    } catch (error) {
      console.error('Create invoice error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all invoices for a school
   */
  static async getAllInvoices(schoolId, filters = {}) {
    try {
      const snapshot = await rtdb.ref(this.INVOICES_REF(schoolId)).once('value');
      if (!snapshot.exists()) return [];

      const invoices = [];
      snapshot.forEach(child => {
        const invoice = { id: child.key, ...child.val() };
        invoices.push(invoice);
      });

      // Apply filters
      let filtered = invoices;
      
      if (filters.studentId) {
        filtered = filtered.filter(inv => inv.studentId === filters.studentId);
      }
      
      if (filters.status) {
        filtered = filtered.filter(inv => inv.status === filters.status);
      }
      
      if (filters.grade) {
        filtered = filtered.filter(inv => inv.studentGrade === filters.grade);
      }
      
      if (filters.section) {
        filtered = filtered.filter(inv => inv.studentSection === filters.section);
      }
      
      if (filters.startDate && filters.endDate) {
        filtered = filtered.filter(inv => 
          inv.date >= filters.startDate && inv.date <= filters.endDate
        );
      }

      // Sort by created date descending
      filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      return filtered;
    } catch (error) {
      console.error('Get all invoices error:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoice(schoolId, invoiceId) {
    try {
      const snapshot = await rtdb.ref(`${this.INVOICES_REF(schoolId)}/${invoiceId}`).once('value');
      if (!snapshot.exists()) return null;
      return { id: invoiceId, ...snapshot.val() };
    } catch (error) {
      console.error('Get invoice error:', error);
      return null;
    }
  }

  /**
   * Get invoices by student ID
   */
  static async getInvoicesByStudent(schoolId, studentId) {
    try {
      const snapshot = await rtdb.ref(this.INVOICES_REF(schoolId))
        .orderByChild('studentId')
        .equalTo(studentId)
        .once('value');
      
      if (!snapshot.exists()) return [];
      
      const invoices = [];
      snapshot.forEach(child => {
        invoices.push({ id: child.key, ...child.val() });
      });
      
      // Sort by date descending
      invoices.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      return invoices;
    } catch (error) {
      console.error('Get invoices by student error:', error);
      return [];
    }
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(schoolId, invoiceId, status) {
    try {
      const validStatuses = ['pending', 'partial', 'paid', 'overdue', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      await rtdb.ref(`${this.INVOICES_REF(schoolId)}/${invoiceId}`).update({
        status,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });

      return { success: true };
    } catch (error) {
      console.error('Update invoice status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record payment for an invoice
   */
  static async recordPayment(schoolId, invoiceId, paymentData) {
    try {
      const invoiceRef = rtdb.ref(`${this.INVOICES_REF(schoolId)}/${invoiceId}`);
      const snapshot = await invoiceRef.once('value');
      
      if (!snapshot.exists()) {
        throw new Error('Invoice not found');
      }

      const invoice = snapshot.val();
      const paymentId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      const payment = {
        id: paymentId,
        invoiceId,
        studentId: invoice.studentId,
        amount: parseFloat(paymentData.amount) || 0,
        method: paymentData.method || 'cash',
        date: paymentData.date || new Date().toISOString().split('T')[0],
        reference: paymentData.reference || '',
        notes: paymentData.notes || '',
        createdAt: admin.database.ServerValue.TIMESTAMP
      };

      // Update invoice
      const payments = [...(invoice.payments || []), payment];
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const pendingAmount = invoice.total - totalPaid;
      
      let status = 'pending';
      if (pendingAmount <= 0) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      }

      await invoiceRef.update({
        payments,
        paidAmount: totalPaid,
        pendingAmount,
        status,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });

      // Update student's pending amount
      await this.updateStudentPendingAmount(schoolId, invoice.studentId);

      // Also save payment to payments collection
      await rtdb.ref(`${this.PAYMENTS_REF(schoolId)}/${paymentId}`).set(payment);

      return { success: true, payment, status };
    } catch (error) {
      console.error('Record payment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update student's pending amount
   */
  static async updateStudentPendingAmount(schoolId, studentId) {
    try {
      const invoices = await this.getInvoicesByStudent(schoolId, studentId);
      
      // Calculate total pending from unpaid invoices
      const totalPending = invoices
        .filter(inv => inv.status !== 'cancelled' && inv.status !== 'paid')
        .reduce((sum, inv) => sum + (inv.pendingAmount || 0), 0);
      
      const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      
      // Update student
      const studentRef = rtdb.ref(`schools/${schoolId}/students/${studentId}`);
      await studentRef.update({
        pendingAmount: totalPending,
        totalPaid: totalPaid,
        status: totalPending === 0 ? 'completed' : 'active',
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });

      return { success: true };
    } catch (error) {
      console.error('Update student pending amount error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete invoice
   */
  static async deleteInvoice(schoolId, invoiceId) {
    try {
      const invoice = await this.getInvoice(schoolId, invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      await rtdb.ref(`${this.INVOICES_REF(schoolId)}/${invoiceId}`).remove();
      
      // Update student's pending amount
      if (invoice.studentId) {
        await this.updateStudentPendingAmount(schoolId, invoice.studentId);
      }

      return { success: true };
    } catch (error) {
      console.error('Delete invoice error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment history for a student
   */
  static async getPaymentHistory(schoolId, studentId) {
    try {
      const snapshot = await rtdb.ref(this.PAYMENTS_REF(schoolId))
        .orderByChild('studentId')
        .equalTo(studentId)
        .once('value');
      
      if (!snapshot.exists()) return [];
      
      const payments = [];
      snapshot.forEach(child => {
        payments.push({ id: child.key, ...child.val() });
      });
      
      payments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      return payments;
    } catch (error) {
      console.error('Get payment history error:', error);
      return [];
    }
  }

  /**
   * Get billing summary for a student
   */
  static async getStudentBillingSummary(schoolId, studentId) {
    try {
      const invoices = await this.getInvoicesByStudent(schoolId, studentId);
      
      const summary = {
        totalInvoiced: 0,
        totalPaid: 0,
        totalPending: 0,
        invoiceCount: invoices.length,
        paidCount: 0,
        partialCount: 0,
        pendingCount: 0,
        overdueCount: 0,
        cancelledCount: 0
      };

      invoices.forEach(inv => {
        summary.totalInvoiced += inv.total || 0;
        summary.totalPaid += inv.paidAmount || 0;
        summary.totalPending += inv.pendingAmount || 0;

        switch (inv.status) {
          case 'paid': summary.paidCount++; break;
          case 'partial': summary.partialCount++; break;
          case 'pending': summary.pendingCount++; break;
          case 'overdue': summary.overdueCount++; break;
          case 'cancelled': summary.cancelledCount++; break;
        }
      });

      return summary;
    } catch (error) {
      console.error('Get student billing summary error:', error);
      return null;
    }
  }

  /**
   * Get billing report for a class
   */
  static async getClassBillingReport(schoolId, grade, section) {
    try {
      const allInvoices = await this.getAllInvoices(schoolId, { grade, section });
      
      const report = {
        grade,
        section,
        totalStudents: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        totalPending: 0,
        students: []
      };

      // Group by student
      const studentMap = new Map();
      allInvoices.forEach(inv => {
        const key = inv.studentId;
        if (!studentMap.has(key)) {
          studentMap.set(key, {
            studentId: inv.studentId,
            studentName: inv.studentName || 'Unknown',
            admissionNo: inv.studentAdmission || '',
            totalInvoiced: 0,
            totalPaid: 0,
            totalPending: 0,
            invoiceCount: 0
          });
        }
        
        const student = studentMap.get(key);
        student.totalInvoiced += inv.total || 0;
        student.totalPaid += inv.paidAmount || 0;
        student.totalPending += inv.pendingAmount || 0;
        student.invoiceCount++;
      });

      report.students = Array.from(studentMap.values());
      report.totalStudents = report.students.length;
      report.totalInvoiced = report.students.reduce((sum, s) => sum + s.totalInvoiced, 0);
      report.totalPaid = report.students.reduce((sum, s) => sum + s.totalPaid, 0);
      report.totalPending = report.students.reduce((sum, s) => sum + s.totalPending, 0);

      return report;
    } catch (error) {
      console.error('Get class billing report error:', error);
      return null;
    }
  }

  /**
   * Get billing dashboard stats
   */
  static async getBillingStats(schoolId) {
    try {
      const invoices = await this.getAllInvoices(schoolId);
      const studentsSnapshot = await rtdb.ref(`schools/${schoolId}/students`).once('value');
      const studentCount = studentsSnapshot.exists() ? studentsSnapshot.numChildren() : 0;

      const stats = {
        totalInvoices: invoices.length,
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        paidCount: 0,
        partialCount: 0,
        pendingCount: 0,
        overdueCount: 0,
        cancelledCount: 0,
        totalStudents: studentCount,
        collectionRate: 0
      };

      invoices.forEach(inv => {
        stats.totalAmount += inv.total || 0;
        stats.totalPaid += inv.paidAmount || 0;
        stats.totalPending += inv.pendingAmount || 0;

        switch (inv.status) {
          case 'paid': stats.paidCount++; break;
          case 'partial': stats.partialCount++; break;
          case 'pending': stats.pendingCount++; break;
          case 'overdue': stats.overdueCount++; break;
          case 'cancelled': stats.cancelledCount++; break;
        }
      });

      stats.collectionRate = stats.totalAmount > 0 
        ? Math.round((stats.totalPaid / stats.totalAmount) * 100) 
        : 0;

      return stats;
    } catch (error) {
      console.error('Get billing stats error:', error);
      return null;
    }
  }
}

module.exports = BillingModel;