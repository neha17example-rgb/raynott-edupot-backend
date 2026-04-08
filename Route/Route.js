const express = require('express');
const router = express.Router();
const AuthController = require('../Controller/AuthController');
const SchoolController = require('../Controller/SchoolController');
const StudentController = require('../Controller/StudentController');

const { requireAuth,requireAdmin } = require('../Middleware/AuthMiddle');

router.post('/login', requireAuth, AuthController.login);

router.get('/profile', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Add to routes file
router.get('/users/:uid/profile', requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Only allow users to access their own profile or admin access
    if (req.user.uid !== uid && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const snapshot = await rtdb.ref(`users/${uid}/profile`).once('value');
    const profile = snapshot.val() || {};
    
    // Also get custom claims
    const userRecord = await admin.auth().getUser(uid);
    const claims = userRecord.customClaims || {};
    
    res.json({
      ...profile,
      fullAccess: profile.fullAccess || claims.fullAccess || false,
      enabledTabs: profile.enabledTabs || [],
      role: profile.role || claims.role || 'user'
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: err.message });
  }
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
// User Management Routes
router.post('/schools/:schoolId/users', requireAuth, requireAdmin, SchoolController.createSchoolUser);
router.get('/schools/:schoolId/users', requireAuth, requireAdmin, SchoolController.getSchoolUsers);
router.patch('/schools/users/:uid', requireAuth, requireAdmin, SchoolController.updateSchoolUser);
router.delete('/schools/users/:uid', requireAuth, requireAdmin, SchoolController.deleteSchoolUser);
router.post('/schools/users/:uid/reset-password', requireAuth, requireAdmin, SchoolController.resetSchoolUserPassword);

// Tab Configuration Routes
router.patch('/schools/:schoolId/tab-config', requireAuth, requireAdmin, SchoolController.updateSchoolTabConfig);
router.get('/schools/:schoolId/tab-config', requireAuth, requireAdmin, SchoolController.getSchoolTabConfig);
router.patch('/schools/:schoolId/status',requireAuth, requireAdmin, SchoolController.toggleSchoolStatus);
router.post('/schools/:schoolId/reset-password',requireAuth, requireAdmin, SchoolController.resetPassword);
// Add to routes
router.patch('/schools/users/:uid/tab-config', requireAuth, requireAdmin, SchoolController.updateUserTabConfig);

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

// Assessment routes
router.get('/students/:studentId/assessments', requireAuth, requireSchoolAdmin, StudentController.getAssessments);
router.post('/students/:studentId/assessments/categories', requireAuth, requireSchoolAdmin, StudentController.addAssessmentCategory);
router.patch('/students/:studentId/assessments/categories/:categoryId', requireAuth, requireSchoolAdmin, StudentController.updateAssessmentCategory);
router.delete('/students/:studentId/assessments/categories/:categoryId', requireAuth, requireSchoolAdmin, StudentController.deleteAssessmentCategory);
router.post('/students/:studentId/assessments/records', requireAuth, requireSchoolAdmin, StudentController.addAssessment);
router.patch('/students/:studentId/assessments/records/:assessmentId', requireAuth, requireSchoolAdmin, StudentController.updateAssessment);
router.delete('/students/:studentId/assessments/records/:assessmentId', requireAuth, requireSchoolAdmin, StudentController.deleteAssessment);




module.exports = router;