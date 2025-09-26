// Firebase Configuration - Secure Environment Variables
// This file will be replaced during deployment with actual credentials

// Environment variables will be injected here during build/deployment
const FIREBASE_CONFIG = {
    apiKey: process.env.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// App ID for Firestore collections
const APP_ID = process.env.APP_ID || "ai_study_notes";

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FIREBASE_CONFIG, APP_ID };
} else {
    window.FIREBASE_CONFIG = FIREBASE_CONFIG;
    window.APP_ID = APP_ID;
}
