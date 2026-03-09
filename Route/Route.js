const express = require('express');
const router = express.Router();
const AuthController = require('../Controller/AuthController');
const SchoolController = require('../Controller/SchoolController');
const StudentController = require('../Controller/StudentController');

const { requireAuth,requireAdmin } = require('../Middleware/AuthMiddle');

// POST /api/auth/login
router.post('/login', requireAuth, AuthController.login);

// Example protected routes (later you add more)
router.get('/profile', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.get('/admin-only', requireAuth, requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Welcome admin!', email: req.user.email });
});

const requireSchoolAdmin = (req, res, next) => {
  if (!req.user?.schoolId || req.user.role !== 'school_admin') {
    return res.status(403).json({ error: 'School admin access required' });
  }
  next();
};

// GET /students/search
router.get('/students/search', requireAuth, requireSchoolAdmin, StudentController.searchStudents);

router.post('/schools',requireAuth, requireAdmin, SchoolController.createSchool);
router.get('/schools',requireAuth, requireAdmin, SchoolController.getAllSchools);
router.delete('/schools/:schoolId', requireAuth, requireAdmin, SchoolController.deleteSchool);
router.patch('/schools/:schoolId/status',requireAuth, requireAdmin, SchoolController.toggleSchoolStatus);
router.post('/schools/:schoolId/reset-password',requireAuth, requireAdmin, SchoolController.resetPassword);


router.post('/students', requireAuth, requireSchoolAdmin, StudentController.createStudent);
router.get('/students', requireAuth, requireSchoolAdmin, StudentController.getAllStudents);
router.get('/students/:studentId', requireAuth, requireSchoolAdmin, StudentController.getStudent);
router.patch('/students/:studentId', requireAuth, requireSchoolAdmin, StudentController.updateStudent);
router.delete('/students/:studentId', requireAuth, requireSchoolAdmin, StudentController.deleteStudent);

// Fees installments
router.post('/students/:studentId/installments', requireAuth, requireSchoolAdmin, StudentController.addInstallment);
router.patch('/students/:studentId/installments/:installmentId', requireAuth, requireSchoolAdmin, StudentController.updateInstallment);
router.delete('/students/:studentId/installments/:installmentId', requireAuth, requireSchoolAdmin, StudentController.deleteInstallment);

// Marks 
router.get(   '/students/:studentId/marks',       requireAuth, requireSchoolAdmin, StudentController.getMarks);
router.post(  '/students/:studentId/marks/exams', requireAuth, requireSchoolAdmin, StudentController.addExam);
router.delete('/students/:studentId/marks/exams/:examId', requireAuth, requireSchoolAdmin, StudentController.deleteExam);
router.patch('/students/:studentId/marks', requireAuth, requireSchoolAdmin, StudentController.updateMarks);




module.exports = router;