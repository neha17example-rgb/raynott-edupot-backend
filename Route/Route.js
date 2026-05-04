const express = require('express');
const router = express.Router();
const AuthController = require('../Controller/AuthController');
const SchoolController = require('../Controller/SchoolController');
const StudentController = require('../Controller/StudentController');
const TeacherController = require('../Controller/TeacherController');
const HallTicketController = require('../Controller/HallTicketController');
const upload = require('../Middleware/multerMiddleware');

const { requireAuth, requireAdmin, requireSchoolAccess } = require('../Middleware/AuthMiddle');

router.post('/login', requireAuth, AuthController.login);

router.get('/profile', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.get('/users/:uid/profile', requireAuth, SchoolController.getUserProfile);

router.get('/admin-only', requireAuth, requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Welcome admin!', email: req.user.email });
});

// ALL Student routes - use requireSchoolAccess for all operations
router.get('/students/search', requireAuth, requireSchoolAccess, StudentController.searchStudents);
router.get('/students', requireAuth, requireSchoolAccess, StudentController.getAllStudents);
router.get('/students/:studentId', requireAuth, requireSchoolAccess, StudentController.getStudent);
router.post('/students', requireAuth, requireSchoolAccess, StudentController.createStudent);
router.patch('/students/:studentId', requireAuth, requireSchoolAccess, StudentController.updateStudent);
router.delete('/students/:studentId', requireAuth, requireSchoolAccess, StudentController.deleteStudent);

// Fees installments
router.post('/students/:studentId/installments', requireAuth, requireSchoolAccess, StudentController.addInstallment);
router.patch('/students/:studentId/installments/:installmentId', requireAuth, requireSchoolAccess, StudentController.updateInstallment);
router.delete('/students/:studentId/installments/:installmentId', requireAuth, requireSchoolAccess, StudentController.deleteInstallment);

// Marks routes
router.get('/students/:studentId/marks', requireAuth, requireSchoolAccess, StudentController.getMarks);
router.post('/students/:studentId/marks/exams', requireAuth, requireSchoolAccess, StudentController.addExam);
router.delete('/students/:studentId/marks/exams/:examId', requireAuth, requireSchoolAccess, StudentController.deleteExam);
router.patch('/students/:studentId/marks', requireAuth, requireSchoolAccess, StudentController.updateMarks);

// Assessment routes
router.get('/students/:studentId/assessments', requireAuth, requireSchoolAccess, StudentController.getAssessments);
router.post('/students/:studentId/assessments/categories', requireAuth, requireSchoolAccess, StudentController.addAssessmentCategory);
router.patch('/students/:studentId/assessments/categories/:categoryId', requireAuth, requireSchoolAccess, StudentController.updateAssessmentCategory);
router.delete('/students/:studentId/assessments/categories/:categoryId', requireAuth, requireSchoolAccess, StudentController.deleteAssessmentCategory);
router.post('/students/:studentId/assessments/records', requireAuth, requireSchoolAccess, StudentController.addAssessment);
router.patch('/students/:studentId/assessments/records/:assessmentId', requireAuth, requireSchoolAccess, StudentController.updateAssessment);
router.delete('/students/:studentId/assessments/records/:assessmentId', requireAuth, requireSchoolAccess, StudentController.deleteAssessment);

router.get('/teachers', requireAuth, requireSchoolAccess, TeacherController.getAllTeachers);
router.get('/teachers/stats/dashboard', requireAuth, requireSchoolAccess, TeacherController.getTeacherStats);
router.get('/teachers/:teacherId', requireAuth, requireSchoolAccess, TeacherController.getTeacherById);
router.post('/teachers', requireAuth, requireSchoolAccess, TeacherController.createTeacher);
router.patch('/teachers/:teacherId', requireAuth, requireSchoolAccess, TeacherController.updateTeacher);
router.delete('/teachers/:teacherId', requireAuth, requireSchoolAccess, TeacherController.deleteTeacher);

router.patch('/teachers/:teacherId/performance/:className', requireAuth, requireSchoolAccess, TeacherController.updateClassPerformance);

router.get('/teachers/subject/:subject', requireAuth, requireSchoolAccess, TeacherController.getTeachersBySubject);
router.get('/teachers/class/:className', requireAuth, requireSchoolAccess, TeacherController.getTeachersByClass);

router.post('/halltickets/:studentId', requireAuth, requireSchoolAccess,upload.single('photo'), HallTicketController.saveHallTicket);

// Get all hall tickets for the school
router.get('/halltickets', requireAuth, requireSchoolAccess, HallTicketController.getAllHallTickets);

// Get specific hall ticket
router.get('/halltickets/:studentId', requireAuth, requireSchoolAccess, HallTicketController.getHallTicket);

// Check if hall ticket exists
router.get('/halltickets/:studentId/exists', requireAuth, requireSchoolAccess, HallTicketController.hallTicketExists);

// Delete hall ticket
router.delete('/halltickets/:studentId', requireAuth, requireSchoolAccess, HallTicketController.deleteHallTicket);

// Get hall tickets by date range
router.get('/halltickets/reports/date-range', requireAuth, requireSchoolAccess, HallTicketController.getHallTicketsByDateRange);

// Bulk generate hall tickets (admin only)
router.post('/halltickets/bulk/generate', requireAuth, requireAdmin,HallTicketController.bulkGenerateHallTickets);

// Get hall ticket template
router.get('/halltickets/template/settings', requireAuth, requireSchoolAccess, HallTicketController.getHallTicketTemplate);

// Save hall ticket template (admin only)
router.post('/halltickets/template/settings', requireAuth, requireAdmin,HallTicketController.saveHallTicketTemplate);

// Export hall tickets as CSV (admin only)
router.get('/halltickets/export/csv', requireAuth, requireAdmin,HallTicketController.exportHallTicketsCSV);

// School management routes (super admin only)
router.post('/schools', requireAuth, requireAdmin, SchoolController.createSchool);
router.get('/schools', requireAuth, requireAdmin, SchoolController.getAllSchools);
router.delete('/schools/:schoolId', requireAuth, requireAdmin, SchoolController.deleteSchool);
router.patch('/schools/:schoolId/status', requireAuth, requireAdmin, SchoolController.toggleSchoolStatus);
router.post('/schools/:schoolId/reset-password', requireAuth, requireAdmin, SchoolController.resetPassword);
router.patch('/schools/:schoolId/tab-config', requireAuth, requireAdmin, SchoolController.updateSchoolTabConfig);
router.get('/schools/:schoolId/tab-config', requireAuth, requireAdmin, SchoolController.getSchoolTabConfig);

// User Management Routes (super admin only)
router.post('/schools/:schoolId/users', requireAuth, requireAdmin, SchoolController.createSchoolUser);
router.get('/schools/:schoolId/users', requireAuth, requireAdmin, SchoolController.getSchoolUsers);
router.patch('/schools/users/:uid', requireAuth, requireAdmin, SchoolController.updateSchoolUser);
router.delete('/schools/users/:uid', requireAuth, requireAdmin, SchoolController.deleteSchoolUser);
router.post('/schools/users/:uid/reset-password', requireAuth, requireAdmin, SchoolController.resetSchoolUserPassword);
router.patch('/schools/users/:uid/tab-config', requireAuth, requireAdmin, SchoolController.updateUserTabConfig);

module.exports = router;