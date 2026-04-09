const { admin, rtdb } = require('../Config/firebaseAdmin');

class AuthModel {
  
  static async verifyIdToken(idToken) {
    try {
      // Force refresh to get latest claims
      const decodedToken = await admin.auth().verifyIdToken(idToken, true);
      
      console.log('Decoded token claims:', {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role,
        schoolId: decodedToken.schoolId,
        admin: decodedToken.admin
      });
      
      // Fetch additional user data from Realtime Database
      let fullAccess = false;
      let enabledTabs = [];
      let profileRole = null;
      let profileSchoolId = null;
      
      try {
        const profileSnapshot = await rtdb.ref(`users/${decodedToken.uid}/profile`).once('value');
        const profile = profileSnapshot.val() || {};
        fullAccess = profile.fullAccess || false;
        enabledTabs = profile.enabledTabs || [];
        profileRole = profile.role;
        profileSchoolId = profile.schoolId;
      } catch (dbError) {
        console.error('Failed to fetch user profile:', dbError);
      }

      // Determine role: Claims take precedence over profile
      const finalRole = decodedToken.role || profileRole || 'user';
      const finalSchoolId = decodedToken.schoolId || profileSchoolId || null;
      const isAdmin = decodedToken.admin === true || finalRole === 'admin';

      return {
        success: true,
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
        picture: decodedToken.picture || null,
        isAdmin: isAdmin,
        schoolId: finalSchoolId,
        role: finalRole,
        fullAccess: fullAccess,
        enabledTabs: enabledTabs,
        emailVerified: !!decodedToken.email_verified,
      };
    } catch (error) {
      console.error('Token verification failed:', error.code, error.message);
      return {
        success: false,
        error: error.code || 'auth/invalid-token',
        message: error.message,
      };
    }
  }

  static async getUserProfile(uid) {
    try {
      const snapshot = await rtdb.ref(`users/${uid}/profile`).once('value');
      const profile = snapshot.val() || {};
      
      // Also get claims for role/schoolId
      const userRecord = await admin.auth().getUser(uid);
      const claims = userRecord.customClaims || {};
      
      return {
        ...profile,
        role: profile.role || claims.role || 'user',
        schoolId: profile.schoolId || claims.schoolId,
        fullAccess: profile.fullAccess || claims.fullAccess || false,
        enabledTabs: profile.enabledTabs || []
      };
    } catch (err) {
      console.error('Profile fetch error:', err);
      return {};
    }
  }

  static async setAdminClaim(uid, isAdmin = true) {
    try {
      await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });
      return { success: true };
    } catch (err) {
      console.error('Set custom claim error:', err);
      return { success: false, error: err.message };
    }
  }
  
  // Add this helper method to refresh user claims
  static async refreshUserClaims(uid) {
    try {
      const user = await admin.auth().getUser(uid);
      const currentClaims = user.customClaims || {};
      // Re-set the same claims to force refresh
      await admin.auth().setCustomUserClaims(uid, currentClaims);
      return { success: true, claims: currentClaims };
    } catch (err) {
      console.error('Refresh claims error:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = AuthModel;