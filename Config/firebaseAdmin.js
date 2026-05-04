const admin = require("firebase-admin");
require("dotenv").config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.FIREBASE_DATABASE,
    storageBucket: process.env.FIREBASE_STORAGE, 
  });
}

const auth = admin.auth();
const db = admin.database();
const rtdb = admin.database();
const storage = admin.storage(); 

module.exports = { admin, auth, db ,rtdb,storage};