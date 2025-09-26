// Configuration file for NoteGenie
// SECURITY: API keys are managed per user account

// Firebase Configuration
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDI8Iw-wC7rFoJ5lefaK9sPz3we05izqKM",
    authDomain: "flowgenie-ee967.firebaseapp.com",
    projectId: "flowgenie-ee967",
    storageBucket: "flowgenie-ee967.firebasestorage.app",
    messagingSenderId: "502614793101",
    appId: "1:502614793101:web:dae7c8fe22f55e2d0a3bc4"
};

// App ID for Firestore collections
const APP_ID = "notegenie";

const CONFIG = {
    // Google Gemini API Configuration - User-specific keys
    GEMINI_API_KEY: null, // Will be set dynamically per user
    
    // API Settings
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    
    // Generation Parameters
    GENERATION_CONFIG: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
    },
    
    // Character Limits
    MAX_CHARACTERS: 100000,
    WARNING_CHARACTERS: 80000,
    
    // App Settings
    APP_NAME: 'NoteGenie',
    VERSION: '2.0.0'
};

// API Key Management Functions
CONFIG.setUserApiKey = function(apiKey) {
    this.GEMINI_API_KEY = apiKey;
    console.log('✅ User API key set successfully');
};

CONFIG.clearUserApiKey = function() {
    this.GEMINI_API_KEY = null;
    console.log('✅ User API key cleared');
};

CONFIG.hasValidApiKey = function() {
    return this.GEMINI_API_KEY && this.GEMINI_API_KEY.length > 20;
};

// Validate configuration
if (!CONFIG.hasValidApiKey()) {
    console.log('ℹ️  No API key set. Users will need to provide their own Gemini API key.');
    console.log('ℹ️  Get a free API key at: https://makersuite.google.com/app/apikey');
}
