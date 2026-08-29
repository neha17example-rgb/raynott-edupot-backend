// Controller/BillingController.js
const BillingModel = require('../Model/BillingModel');
const StudentModel = require('../Model/StudentModel');

class BillingController {
  /**
   * Create a new invoice
   */
  static async createInvoice(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const invoiceData = req.body;
      
      // Validate required fields
      if (!invoiceData.studentId) {
        return res.status(400).json({ success: false, error: 'Student ID is required' });
      }
      
      if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one item is required' });
      }

      // Get student details
      const student = await StudentModel.getStudent(schoolId, invoiceData.studentId);
      if (!student) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      // Enrich invoice with student details
      invoiceData.studentName = student.basicInfo?.name || '';
      invoiceData.studentAdmission = student.basicInfo?.admissionNo || '';
      invoiceData.studentGrade = student.basicInfo?.grade || '';
      invoiceData.studentSection = student.basicInfo?.section || '';
      invoiceData.studentFather = student.basicInfo?.fatherName || '';
      invoiceData.studentPhone = student.basicInfo?.fatherPhone || '';

      const result = await BillingModel.createInvoice(schoolId, invoiceData);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get all invoices with optional filters
   */
  static async getAllInvoices(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const { studentId, status, grade, section, startDate, endDate } = req.query;
      
      const filters = {};
      if (studentId) filters.studentId = studentId;
      if (status) filters.status = status;
      if (grade) filters.grade = grade;
      if (section) filters.section = section;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const invoices = await BillingModel.getAllInvoices(schoolId, filters);
      
      res.json({
        success: true,
        invoices,
        count: invoices.length
      });
    } catch (error) {
      console.error('Get all invoices error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoice(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const { invoiceId } = req.params;
      const invoice = await BillingModel.getInvoice(schoolId, invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      
      res.json({ success: true, invoice });
    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get invoices by student
   */
  static async getInvoicesByStudent(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const { studentId } = req.params;
      const invoices = await BillingModel.getInvoicesByStudent(schoolId, studentId);
      
      res.json({
        success: true,
        invoices,
        count: invoices.length
      });
    } catch (error) {
      console.error('Get invoices by student error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Record payment for an invoice
   */
  static async recordPayment(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const { invoiceId } = req.params;
      const paymentData = req.body;
      
      if (!paymentData.amount || paymentData.amount <= 0) {
        return res.status(400).json({ success: false, error: 'Valid payment amount is required' });
      }

      const result = await BillingModel.recordPayment(schoolId, invoiceId, paymentData);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Record payment error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const { invoiceId } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }

      const result = await BillingModel.updateInvoiceStatus(schoolId, invoiceId, status);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update invoice status error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Delete invoice
   */
  static async deleteInvoice(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const { invoiceId } = req.params;
      const result = await BillingModel.deleteInvoice(schoolId, invoiceId);
      
      if (result.success) {
        res.json({ success: true, message: 'Invoice deleted successfully' });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Delete invoice error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get payment history for a student
   */
  static async getPaymentHistory(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const { studentId } = req.params;
      const payments = await BillingModel.getPaymentHistory(schoolId, studentId);
      
      res.json({
        success: true,
        payments,
        count: payments.length
      });
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get student billing summary
   */
  static async getStudentBillingSummary(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const { studentId } = req.params;
      const summary = await BillingModel.getStudentBillingSummary(schoolId, studentId);
      
      if (!summary) {
        return res.status(404).json({ success: false, error: 'No billing data found' });
      }
      
      res.json({ success: true, summary });
    } catch (error) {
      console.error('Get student billing summary error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get class billing report
   */
  static async getClassBillingReport(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const { grade, section } = req.params;
      const report = await BillingModel.getClassBillingReport(schoolId, grade, section);
      
      if (!report) {
        return res.status(404).json({ success: false, error: 'No data found for this class' });
      }
      
      res.json({ success: true, report });
    } catch (error) {
      console.error('Get class billing report error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get billing dashboard stats
   */
  static async getBillingStats(req, res) {
    const schoolId = req.user?.schoolId;
    if (!schoolId || (req.user.role !== 'school_admin' && req.user.role !== 'school_user')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    try {
      const stats = await BillingModel.getBillingStats(schoolId);
      
      if (!stats) {
        return res.status(404).json({ success: false, error: 'No billing data found' });
      }
      
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Get billing stats error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = BillingController;