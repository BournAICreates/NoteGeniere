// API Configuration for User Authentication and Data Sync
const API_CONFIG = {
    // Backend API Base URL - Update this to your actual backend URL
    BASE_URL: 'https://your-backend-api.com/api',
    
    // API Endpoints
    ENDPOINTS: {
        // Authentication endpoints
        REGISTER: '/auth/register',
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH_TOKEN: '/auth/refresh',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
        
        // User data endpoints
        GET_USER_DATA: '/user/data',
        SAVE_USER_DATA: '/user/data',
        SYNC_DATA: '/user/sync',
        
        // Health check
        HEALTH: '/health'
    },
    
    // Request timeout (in milliseconds)
    TIMEOUT: 10000,
    
    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};

// True cloud-based user system for cross-device access
const CLOUD_API = {
    // Simulate API delay
    DELAY: 300,
    
    // Primary cloud storage - using a reliable service
    CLOUD_BASE_URL: 'https://api.jsonbin.io/v3/b',
    USERS_BIN_ID: '65f8a1231f5677401f2b8c9a',
    DATA_BIN_ID: '65f8a1241f5677401f2b8c9b',
    
    // API key for cloud storage
    API_KEY: '$2a$10$8K1p/a0dL3Y7ZxE5vQ8w3e.9mN2pL6sR8tU1vW4xY7zA0bC3dE6fG9hI2jK5mN8pQ',
    
    // Get users from cloud storage - PRIMARY METHOD
    async getUsers() {
        console.log('🌐 Loading users from cloud storage...');
        
        try {
            const response = await fetch(`${this.CLOUD_BASE_URL}/${this.USERS_BIN_ID}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const users = new Map(data.record || []);
                console.log(`✅ Loaded ${users.size} users from cloud storage`);
                
                // Update localStorage as backup
                localStorage.setItem('mock_users', JSON.stringify([...users]));
                return users;
            } else {
                console.log(`❌ Cloud response not OK: ${response.status}`);
                throw new Error(`Cloud storage error: ${response.status}`);
            }
        } catch (error) {
            console.log('❌ Cloud storage failed:', error.message);
            console.log('📱 Falling back to localStorage');
            
            // Fallback to localStorage
            const stored = localStorage.getItem('mock_users');
            return stored ? new Map(JSON.parse(stored)) : new Map();
        }
    },
    
    // Save users to cloud storage - PRIMARY METHOD
    async saveUsers(users) {
        console.log(`💾 Saving ${users.size} users to cloud storage...`);
        
        try {
            const response = await fetch(`${this.CLOUD_BASE_URL}/${this.USERS_BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.API_KEY
                },
                body: JSON.stringify([...users])
            });
            
            if (response.ok) {
                console.log('✅ Successfully saved users to cloud storage');
                
                // Also save locally as backup
                localStorage.setItem('mock_users', JSON.stringify([...users]));
                console.log('💾 Saved to localStorage backup');
                return true;
            } else {
                console.log(`❌ Cloud save failed: ${response.status}`);
                throw new Error(`Cloud storage error: ${response.status}`);
            }
        } catch (error) {
            console.log('❌ Cloud storage save failed:', error.message);
            console.log('💾 Saving to localStorage only');
            
            // Save locally as fallback
            localStorage.setItem('mock_users', JSON.stringify([...users]));
            return false;
        }
    },
    
    // Get user data from cloud storage - PRIMARY METHOD
    async getUserData() {
        console.log('🌐 Loading user data from cloud storage...');
        
        try {
            const response = await fetch(`${this.CLOUD_BASE_URL}/${this.DATA_BIN_ID}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const userData = new Map(data.record || []);
                console.log(`✅ Loaded user data from cloud storage`);
                
                // Update localStorage as backup
                localStorage.setItem('mock_user_data', JSON.stringify([...userData]));
                return userData;
            } else {
                console.log(`❌ Cloud data response not OK: ${response.status}`);
                throw new Error(`Cloud storage error: ${response.status}`);
            }
        } catch (error) {
            console.log('❌ Cloud data storage failed:', error.message);
            console.log('📱 Falling back to localStorage for user data');
            
            // Fallback to localStorage
            const stored = localStorage.getItem('mock_user_data');
            return stored ? new Map(JSON.parse(stored)) : new Map();
        }
    },
    
    // Save user data to cloud storage - PRIMARY METHOD
    async saveUserData(userData) {
        console.log(`💾 Saving user data to cloud storage...`);
        
        try {
            const response = await fetch(`${this.CLOUD_BASE_URL}/${this.DATA_BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.API_KEY
                },
                body: JSON.stringify([...userData])
            });
            
            if (response.ok) {
                console.log('✅ Successfully saved user data to cloud storage');
                
                // Also save locally as backup
                localStorage.setItem('mock_user_data', JSON.stringify([...userData]));
                console.log('💾 Saved user data to localStorage backup');
                return true;
            } else {
                console.log(`❌ Cloud data save failed: ${response.status}`);
                throw new Error(`Cloud storage error: ${response.status}`);
            }
        } catch (error) {
            console.log('❌ Cloud data storage save failed:', error.message);
            console.log('💾 Saving user data to localStorage only');
            
            // Save locally as fallback
            localStorage.setItem('mock_user_data', JSON.stringify([...userData]));
            return false;
        }
    }
};

// Simple password hashing (in production, use proper bcrypt on server)
function simpleHash(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}

// Generate a simple JWT-like token (in production, use proper JWT)
function generateToken(userId) {
    const payload = {
        userId: userId,
        timestamp: Date.now(),
        random: Math.random().toString(36).substring(2)
    };
    return btoa(JSON.stringify(payload));
}

// Parse token
function parseToken(token) {
    try {
        return JSON.parse(atob(token));
    } catch (e) {
        return null;
    }
}

// Mock API functions for development
const MockAPI = {
    // Simulate network delay
    async delay(ms = CLOUD_API.DELAY) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Register user
    async register(userData) {
        await this.delay();
        
        const { name, email, password } = userData;
        
        // Get users from cloud storage
        const users = await CLOUD_API.getUsers();
        
        // Check if user already exists
        if (users.has(email)) {
            throw new Error('User already exists with this email');
        }
        
        // Create user
        const userId = 'user_' + Date.now();
        const hashedPassword = simpleHash(password);
        
        users.set(email, {
            id: userId,
            name: name,
            email: email,
            password: hashedPassword,
            apiKey: null, // Store user's API key
            createdAt: new Date().toISOString()
        });
        
        // Save to cloud storage
        await CLOUD_API.saveUsers(users);
        
        // Initialize user data
        const userDataMap = await CLOUD_API.getUserData();
        userDataMap.set(userId, {
            projects: [],
            flashcards: [],
            lastSync: new Date().toISOString()
        });
        await CLOUD_API.saveUserData(userDataMap);
        
        const token = generateToken(userId);
        
        console.log('✅ User registered successfully:', { userId, name, email });
        console.log('📊 Total users in database:', users.size);
        
        return {
            success: true,
            token: token,
            user: {
                id: userId,
                name: name,
                email: email
            }
        };
    },
    
    // Login user
    async login(credentials) {
        await this.delay();
        
        const { email, password } = credentials;
        const hashedPassword = simpleHash(password);
        
        // Get users from cloud storage
        const users = await CLOUD_API.getUsers();
        const user = users.get(email);
        console.log('🔍 Login attempt for email:', email);
        console.log('👥 Users in database:', Array.from(users.keys()));
        
        if (!user) {
            console.log('❌ User not found');
            throw new Error('Invalid email or password');
        }
        
        if (user.password !== hashedPassword) {
            console.log('❌ Password mismatch');
            throw new Error('Invalid email or password');
        }
        
        console.log('✅ Login successful for user:', user.name);
        
        const token = generateToken(user.id);
        
        return {
            success: true,
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        };
    },
    
    // Get user data
    async getUserData(userId) {
        await this.delay();
        
        const userDataMap = await CLOUD_API.getUserData();
        const userDataRecord = userDataMap.get(userId);
        if (!userDataRecord) {
            throw new Error('User data not found');
        }
        
        return {
            success: true,
            data: userDataRecord
        };
    },
    
    // Save user data
    async saveUserData(userId, data) {
        await this.delay();
        
        const userDataMap = await CLOUD_API.getUserData();
        const userDataRecord = userDataMap.get(userId) || { projects: [], flashcards: [] };
        
        // Ensure data isolation - only save data for the specific user
        userDataRecord.projects = (data.projects || []).filter(project => 
            project.userId === userId
        );
        userDataRecord.flashcards = data.flashcards || userDataRecord.flashcards;
        userDataRecord.lastSync = new Date().toISOString();
        
        userDataMap.set(userId, userDataRecord);
        await CLOUD_API.saveUserData(userDataMap);
        
        console.log(`💾 Data saved for user ${userId}:`, {
            projects: userDataRecord.projects.length,
            flashcards: userDataRecord.flashcards.length
        });
        
        return {
            success: true,
            message: 'Data saved successfully'
        };
    },
    
    // Forgot password
    async forgotPassword(email) {
        await this.delay();
        
        const user = MOCK_API.USERS.get(email);
        if (!user) {
            throw new Error('No account found with this email');
        }
        
        // In a real app, you would send an email here
        console.log(`Password reset link would be sent to: ${email}`);
        
        return {
            success: true,
            message: 'Password reset link sent to your email'
        };
    },
    
    // Clear all mock data (for testing)
    clearAllData() {
        localStorage.removeItem('mock_users');
        localStorage.removeItem('mock_user_data');
        console.log('All mock data cleared');
    },
    
    // Get all registered users (for debugging)
    async getAllUsers() {
        const users = await CLOUD_API.getUsers();
        return Array.from(users.values());
    },
    
    // API Key Management
    async saveUserApiKey(userId, apiKey) {
        await this.delay();
        
        // Get users from cloud storage
        const users = await CLOUD_API.getUsers();
        
        // Find user by ID
        let user = null;
        for (const [email, userData] of users) {
            if (userData.id === userId) {
                user = userData;
                break;
            }
        }
        
        if (!user) {
            throw new Error('User not found');
        }
        
        // Update user with API key
        users.set(user.email, {
            ...user,
            apiKey: apiKey
        });
        await CLOUD_API.saveUsers(users);
        
        console.log('✅ API key saved for user:', user.name);
        return { success: true };
    },
    
    async getUserApiKey(userId) {
        await this.delay();
        
        // Get users from cloud storage
        const users = await CLOUD_API.getUsers();
        
        // Find user by ID
        for (const [email, userData] of users) {
            if (userData.id === userId) {
                return {
                    success: true,
                    apiKey: userData.apiKey || null
                };
            }
        }
        
        throw new Error('User not found');
    },
    
    async removeUserApiKey(userId) {
        await this.delay();
        
        // Get users from cloud storage
        const users = await CLOUD_API.getUsers();
        
        // Find user by ID
        let user = null;
        for (const [email, userData] of users) {
            if (userData.id === userId) {
                user = userData;
                break;
            }
        }
        
        if (!user) {
            throw new Error('User not found');
        }
        
        // Remove API key from user
        users.set(user.email, {
            ...user,
            apiKey: null
        });
        await CLOUD_API.saveUsers(users);
        
        console.log('✅ API key removed for user:', user.name);
        return { success: true };
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIG, MockAPI, CLOUD_API, generateToken, parseToken };
} else {
    window.API_CONFIG = API_CONFIG;
    window.MockAPI = MockAPI;
    window.CLOUD_API = CLOUD_API;
    window.generateToken = generateToken;
    window.parseToken = parseToken;
    
    // Debug: Log that MockAPI is loaded
    console.log('🔧 MockAPI loaded successfully');
    console.log('📊 MockAPI methods:', Object.keys(MockAPI));
}
