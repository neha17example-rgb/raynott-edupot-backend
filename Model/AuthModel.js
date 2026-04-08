const { admin, rtdb } = require('../Config/firebaseAdmin');

class AuthModel {
  
  static async verifyIdToken(idToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken, true);
      
      // Fetch additional user data from Realtime Database
      let fullAccess = false;
      let enabledTabs = [];
      
      try {
        const profileSnapshot = await rtdb.ref(`users/${decodedToken.uid}/profile`).once('value');
        const profile = profileSnapshot.val() || {};
        fullAccess = profile.fullAccess || false;
        enabledTabs = profile.enabledTabs || [];
      } catch (dbError) {
        console.error('Failed to fetch user profile:', dbError);
      }

      return {
        success: true,
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
        picture: decodedToken.picture || null,
        isAdmin: !!decodedToken.admin,
        schoolId: decodedToken.schoolId || null,
        role: decodedToken.role || 'user',
        fullAccess: fullAccess,        // ← Add this
        enabledTabs: enabledTabs,      // ← Add this
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
      return snapshot.val() || {};
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
}

module.exports = AuthModel;