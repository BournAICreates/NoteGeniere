// Firebase-based API Configuration for NoteGenie2
// This replaces the old cloud system with Firebase for true cross-device access

// Initialize Firebase (will be called from script.js)
let auth = null;
let db = null;

// Initialize Firebase connection
function initializeFirebase() {
    if (typeof firebase !== 'undefined') {
        const app = firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log('🔥 Firebase initialized successfully');
        return true;
    } else {
        console.error('❌ Firebase SDK not loaded');
        return false;
    }
}

// Mock API for compatibility with existing code
const MockAPI = {
    // Simulate API delay
    DELAY: 300,

    // Delay function
    async delay() {
        return new Promise(resolve => setTimeout(resolve, this.DELAY));
    },

    // User Authentication
    async register(userData) {
        await this.delay();
        
        if (!auth) {
            throw new Error('Firebase not initialized');
        }

        const { name, email, password } = userData;
        
        try {
            // Create user with Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update user profile
            await user.updateProfile({
                displayName: name
            });

            // Create user data document in Firestore
            await db.collection('artifacts').doc(APP_ID).collection('users').doc(user.uid).collection('user_data').doc('data').set({
                projects: [],
                flashcards: [],
                apiKey: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ User registered successfully with Firebase');
            
            return {
                success: true,
                user: {
                    id: user.uid,
                    name: name,
                    email: email,
                    createdAt: new Date().toISOString()
                },
                token: await user.getIdToken()
            };
        } catch (error) {
            console.error('❌ Registration failed:', error);
            throw new Error(error.message);
        }
    },

    async login(credentials) {
        await this.delay();
        
        if (!auth) {
            throw new Error('Firebase not initialized');
        }

        const { email, password } = credentials;
        
        try {
            // Sign in with Firebase Auth
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('✅ User logged in successfully with Firebase');
            
            return {
                success: true,
                user: {
                    id: user.uid,
                    name: user.displayName || email,
                    email: email
                },
                token: await user.getIdToken()
            };
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw new Error(error.message);
        }
    },

    async logout() {
        await this.delay();
        
        if (!auth) {
            throw new Error('Firebase not initialized');
        }

        try {
            await auth.signOut();
            console.log('✅ User logged out successfully');
            return { success: true };
        } catch (error) {
            console.error('❌ Logout failed:', error);
            throw new Error(error.message);
        }
    },

    // User Data Management
    async getUserData(userId) {
        await this.delay();
        
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        try {
            const doc = await db.collection('artifacts').doc(APP_ID).collection('users').doc(userId).collection('user_data').doc('data').get();
            
            if (doc.exists) {
                const data = doc.data();
                console.log('✅ User data loaded from Firebase');
                return {
                    success: true,
                    data: {
                        projects: data.projects || [],
                        flashcards: data.flashcards || [],
                        apiKey: data.apiKey || null
                    }
                };
            } else {
                // Create initial document
                const initialData = {
                    projects: [],
                    flashcards: [],
                    apiKey: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection('artifacts').doc(APP_ID).collection('users').doc(userId).collection('user_data').doc('data').set(initialData);
                
                console.log('✅ Initial user data created in Firebase');
                return {
                    success: true,
                    data: {
                        projects: [],
                        flashcards: [],
                        apiKey: null
                    }
                };
            }
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
            throw new Error(error.message);
        }
    },

    async saveUserData(userId, userData) {
        await this.delay();
        
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        try {
            await db.collection('artifacts').doc(APP_ID).collection('users').doc(userId).collection('user_data').doc('data').update({
                projects: userData.projects || [],
                flashcards: userData.flashcards || [],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ User data saved to Firebase');
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to save user data:', error);
            throw new Error(error.message);
        }
    },

    // API Key Management
    async saveUserApiKey(userId, apiKey) {
        await this.delay();
        
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        try {
            await db.collection('artifacts').doc(APP_ID).collection('users').doc(userId).collection('user_data').doc('data').update({
                apiKey: apiKey,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ API key saved to Firebase');
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to save API key:', error);
            throw new Error(error.message);
        }
    },

    async getUserApiKey(userId) {
        await this.delay();
        
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        try {
            const doc = await db.collection('artifacts').doc(APP_ID).collection('users').doc(userId).collection('user_data').doc('data').get();
            
            if (doc.exists) {
                const data = doc.data();
                console.log('✅ API key loaded from Firebase');
                return {
                    success: true,
                    apiKey: data.apiKey || null
                };
            } else {
                console.log('ℹ️ No user data found');
                return {
                    success: true,
                    apiKey: null
                };
            }
        } catch (error) {
            console.error('❌ Failed to load API key:', error);
            throw new Error(error.message);
        }
    },

    async removeUserApiKey(userId) {
        await this.delay();
        
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        try {
            await db.collection('artifacts').doc(APP_ID).collection('users').doc(userId).collection('user_data').doc('data').update({
                apiKey: null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ API key removed from Firebase');
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to remove API key:', error);
            throw new Error(error.message);
        }
    },

    // Real-time data listener
    setupRealtimeListener(userId, callback) {
        if (!db) {
            console.error('❌ Firebase not initialized');
            return null;
        }

        const userDataRef = db.collection('artifacts').doc(APP_ID).collection('users').doc(userId).collection('user_data').doc('data');
        
        return userDataRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                callback({
                    success: true,
                    data: {
                        projects: data.projects || [],
                        flashcards: data.flashcards || [],
                        apiKey: data.apiKey || null
                    }
                });
            }
        }, (error) => {
            console.error('❌ Real-time listener error:', error);
            callback({
                success: false,
                error: error.message
            });
        });
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MockAPI, initializeFirebase };
} else {
    window.MockAPI = MockAPI;
    window.initializeFirebase = initializeFirebase;
}
