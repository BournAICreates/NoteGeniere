// NoteGenie - Main Application Logic

// Initialize Firebase when the page loads
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initializeFirebase === 'function') {
        initializeFirebase();
    }
});

class StudyNotesApp {
    constructor() {
        this.projects = this.loadProjects();
        this.currentProject = null;
        this.currentNote = null;
        this.currentView = 'dashboard';
        this.currentDate = new Date();
        this.selectedDate = null;
        this.currentFlashcardSet = null;
        this.currentFlashcardIndex = 0;
        this.flashcardFlipped = false;
        this.currentEditingNote = null;
        
        // Quiz state
        this.quizQuestions = [];
        this.currentQuizIndex = 0;
        this.quizResponses = {};
        this.quizSubmitted = false;
        
        // Chat state
        this.currentChatNote = null;
        this.chatHistory = [];
        this.isTyping = false;
        
        // Authentication state
        this.currentUser = null;
        this.authToken = null;
        this.isAuthenticated = false;
        this.autoSaveEnabled = true;
        
        this.initializeApp();
        this.bindEvents();
    }

    // Initialize the application
    initializeApp() {
        this.initializeConfig();
        this.checkAuthentication();
        
        // Load projects from localStorage if not authenticated
        if (!this.isAuthenticated) {
            this.projects = this.loadProjects();
        }
        
        this.updateProjectsList();
        this.updateProjectSelect();
        this.showView('dashboard');
        this.updateCharCount();
        
        // Check if we should show a welcome message for auto-login
        this.checkAutoLoginStatus();
    }

    // Initialize configuration settings
    initializeConfig() {
        // Update character limit display
        if (CONFIG && CONFIG.MAX_CHARACTERS) {
            document.getElementById('maxChars').textContent = CONFIG.MAX_CHARACTERS.toLocaleString();
        }
        
        // Check if API key is configured
        if (!CONFIG || CONFIG.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
            console.warn('⚠️  Please configure your Gemini API key in config.js');
            // You could also show a notification to the user here
        }
    }

    // Bind all event listeners
    bindEvents() {
        // Navigation buttons
        document.getElementById('newProjectBtn').addEventListener('click', () => this.showView('noteGeneration'));
        document.getElementById('dashboardBtn').addEventListener('click', () => this.showView('dashboard'));
        document.getElementById('calendarBtn').addEventListener('click', () => this.showView('calendar'));
        document.getElementById('flashcardsBtn').addEventListener('click', () => this.showView('flashcards'));
        document.getElementById('backToDashboardBtn').addEventListener('click', () => this.showView('dashboard'));

        // Project management
        document.getElementById('createProjectBtn').addEventListener('click', () => this.showProjectModal());
        document.getElementById('createProjectConfirmBtn').addEventListener('click', () => this.createProject());
        document.getElementById('cancelProjectBtn').addEventListener('click', () => this.hideProjectModal());

        // Note generation
        document.getElementById('generateNotesBtn').addEventListener('click', () => this.generateNotes());
        document.getElementById('transcriptionText').addEventListener('input', () => this.updateCharCount());

        // Note actions
        document.getElementById('saveNotesBtn').addEventListener('click', () => this.saveNotes());
        document.getElementById('downloadNotesBtn').addEventListener('click', () => this.downloadNotes());

        // Rename functionality
        document.getElementById('renameProjectBtn').addEventListener('click', () => this.showRenameModal('project'));
        document.getElementById('confirmRenameBtn').addEventListener('click', () => this.confirmRename());
        document.getElementById('cancelRenameBtn').addEventListener('click', () => this.hideRenameModal());

        // Calendar functionality
        document.getElementById('prevMonthBtn').addEventListener('click', () => this.previousMonth());
        document.getElementById('nextMonthBtn').addEventListener('click', () => this.nextMonth());
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());
        
        // Date assignment
        document.getElementById('confirmDateBtn').addEventListener('click', () => this.confirmDateAssignment());
        document.getElementById('cancelDateBtn').addEventListener('click', () => this.hideDateModal());
        
        // Calendar note modal
        document.getElementById('createNoteForDateBtn').addEventListener('click', () => this.createNoteForDate());
        document.getElementById('closeCalendarNoteModalBtn').addEventListener('click', () => this.hideCalendarNoteModal());

        // Flashcard functionality
        document.getElementById('confirmFlashcardGenerationBtn').addEventListener('click', () => this.confirmFlashcardGeneration());
        document.getElementById('cancelFlashcardGenerationBtn').addEventListener('click', () => this.hideFlashcardModal());
        document.getElementById('closeFlashcardStudyBtn').addEventListener('click', () => this.hideFlashcardStudyModal());
        document.getElementById('prevFlashcardBtn').addEventListener('click', () => this.previousFlashcard());
        document.getElementById('nextFlashcardBtn').addEventListener('click', () => this.nextFlashcard());
        document.getElementById('flipFlashcardBtn').addEventListener('click', () => this.flipFlashcard());

        // Test generation
        const confirmTestBtn = document.getElementById('confirmTestGenerationBtn');
        if (confirmTestBtn) confirmTestBtn.addEventListener('click', () => this.confirmTestGeneration());
        const cancelTestBtn = document.getElementById('cancelTestGenerationBtn');
        if (cancelTestBtn) cancelTestBtn.addEventListener('click', () => this.hideTestOptionsModal());
        const closeTestViewBtn = document.getElementById('closeTestViewBtn');
        if (closeTestViewBtn) closeTestViewBtn.addEventListener('click', () => this.hideTestViewModal());
        const submitTestBtn = document.getElementById('submitTestBtn');
        if (submitTestBtn) submitTestBtn.addEventListener('click', () => this.submitInteractiveTest());
        const showAnswersBtn = document.getElementById('showAnswersBtn');
        if (showAnswersBtn) showAnswersBtn.addEventListener('click', () => this.showTestAnswers());
        const retakeTestBtn = document.getElementById('retakeTestBtn');
        if (retakeTestBtn) retakeTestBtn.addEventListener('click', () => this.retakeInteractiveTest());
        
        // Quiz interface event listeners
        const startQuizBtn = document.getElementById('startQuizBtn');
        if (startQuizBtn) startQuizBtn.addEventListener('click', () => this.startQuiz());
        const prevQuestionBtn = document.getElementById('prevQuestionBtn');
        if (prevQuestionBtn) prevQuestionBtn.addEventListener('click', () => this.previousQuestion());
        const nextQuestionBtn = document.getElementById('nextQuestionBtn');
        if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', () => this.nextQuestion());
        const finishQuizBtn = document.getElementById('finishQuizBtn');
        if (finishQuizBtn) finishQuizBtn.addEventListener('click', () => this.finishQuiz());

        // Note editing functionality
        document.getElementById('saveNoteEditBtn').addEventListener('click', () => this.saveNoteEdit());
        document.getElementById('cancelNoteEditBtn').addEventListener('click', () => this.hideNoteEditModal());
        document.getElementById('closeNoteViewBtn').addEventListener('click', () => this.hideNoteViewModal());

        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.classList.remove('active');
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Project selection
        document.getElementById('projectSelect').addEventListener('change', (e) => {
            this.currentProject = e.target.value;
        });
        
        // Chat functionality
        document.getElementById('chatBtn').addEventListener('click', () => this.showChatView());
        document.getElementById('chatNoteSelect').addEventListener('change', (e) => this.selectChatNote(e.target.value));
        document.getElementById('sendChatBtn').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });
        
        // Authentication functionality
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('forgotPasswordForm').addEventListener('submit', (e) => this.handleForgotPassword(e));
        
        // API Key management
        document.getElementById('apiKeyBtn').addEventListener('click', () => this.showApiKeyModal());
        document.getElementById('apiKeyForm').addEventListener('submit', (e) => this.handleApiKeyForm(e));
        document.getElementById('toggleApiKeyVisibility').addEventListener('click', () => this.toggleApiKeyVisibility());
        
        // Modal navigation
        document.getElementById('showRegisterLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideLoginModal();
            this.showRegisterModal();
        });
        document.getElementById('showLoginLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideRegisterModal();
            this.showLoginModal();
        });
        document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideLoginModal();
            this.showForgotPasswordModal();
        });
        document.getElementById('backToLoginLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideForgotPasswordModal();
            this.showLoginModal();
        });
        
        // Modal close event listeners
        document.getElementById('loginModal').addEventListener('click', (e) => {
            if (e.target.id === 'loginModal') {
                this.hideLoginModal();
            }
        });
        document.getElementById('registerModal').addEventListener('click', (e) => {
            if (e.target.id === 'registerModal') {
                this.hideRegisterModal();
            }
        });
        document.getElementById('forgotPasswordModal').addEventListener('click', (e) => {
            if (e.target.id === 'forgotPasswordModal') {
                this.hideForgotPasswordModal();
            }
        });
    }

    // View management
    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        document.getElementById(`${viewName}View`).classList.add('active');
        this.currentView = viewName;

        // Update UI based on view
        if (viewName === 'dashboard') {
            this.updateProjectsList();
        } else if (viewName === 'projectNotes') {
            this.updateProjectNotesView();
        } else if (viewName === 'calendar') {
            this.updateCalendarView();
        } else if (viewName === 'flashcards') {
            this.updateFlashcardsView();
        } else if (viewName === 'chat') {
            this.updateChatView();
        }
    }

    // Project management
    showProjectModal() {
        document.getElementById('projectModal').classList.add('active');
        document.getElementById('projectNameInput').focus();
    }

    hideProjectModal() {
        document.getElementById('projectModal').classList.remove('active');
        document.getElementById('projectNameInput').value = '';
    }

    createProject() {
        // Check if user is logged in
        if (!this.isAuthenticated) {
            this.showNotification('Please log in to create projects', 'error');
            this.showLoginModal();
            return;
        }
        
        const projectName = document.getElementById('projectNameInput').value.trim();
        
        if (!projectName) {
            this.showNotification('Please enter a project name', 'error');
            return;
        }

        if (this.projects.some(p => p.name.toLowerCase() === projectName.toLowerCase())) {
            this.showNotification('A project with this name already exists', 'error');
            return;
        }

        const newProject = {
            id: Date.now().toString(),
            name: projectName,
            notes: [],
            createdAt: new Date().toISOString(),
            userId: this.currentUser.id // Associate project with user
        };

        this.projects.push(newProject);
        this.saveUserData();
        this.updateProjectsList();
        this.updateProjectSelect();
        this.hideProjectModal();

        // Auto-select the new project
        document.getElementById('projectSelect').value = newProject.id;
        this.currentProject = newProject.id;
        
        this.showNotification('Project created successfully!', 'success');
    }

    updateProjectsList() {
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = '';

        if (this.projects.length === 0) {
            projectsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open" style="font-size: 3rem; color: rgba(255,255,255,0.5); margin-bottom: 1rem;"></i>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No projects yet</h3>
                    <p style="color: rgba(255,255,255,0.8);">Create your first project to start organizing your study notes</p>
                </div>
            `;
            return;
        }

        this.projects.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'project-card fade-in';
            projectCard.innerHTML = `
                <div class="project-card-header">
                    <h3 class="project-card-title">${this.escapeHtml(project.name)}</h3>
                    <div class="project-card-actions">
                        <button class="btn btn-outline btn-sm" onclick="app.renameProject('${project.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="app.deleteProject('${project.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="project-card-meta">
                    Created: ${new Date(project.createdAt).toLocaleDateString()}
                </div>
                <div class="project-card-notes-count">
                    ${project.notes.length} note${project.notes.length !== 1 ? 's' : ''}
                </div>
            `;

            projectCard.addEventListener('click', (e) => {
                if (!e.target.closest('.project-card-actions')) {
                    this.currentProject = project.id;
                    this.showProjectNotes(project);
                }
            });

            projectsList.appendChild(projectCard);
        });
    }

    showProjectNotes(project) {
        this.currentProject = project.id;
        document.getElementById('projectTitle').textContent = project.name;
        this.showView('projectNotes');
    }

    updateProjectNotesView() {
        const project = this.projects.find(p => p.id === this.currentProject);
        if (!project) return;

        const notesList = document.getElementById('projectNotesList');
        notesList.innerHTML = '';

        if (project.notes.length === 0 && (!project.flashcardSets || project.flashcardSets.length === 0)) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt" style="font-size: 3rem; color: #a0aec0; margin-bottom: 1rem;"></i>
                    <h3 style="color: #4a5568; margin-bottom: 0.5rem;">No notes yet</h3>
                    <p style="color: #718096;">Generate your first study notes to get started</p>
                </div>
            `;
            return;
        }

        project.notes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item fade-in';
            noteItem.innerHTML = `
                <div class="note-header">
                    <h4 class="note-title">${this.escapeHtml(note.title)}</h4>
                     <div class="note-actions">
                         <button class="btn btn-primary btn-sm" onclick="app.generateFlashcards('${note.id}')">
                             <i class="fas fa-layer-group"></i> Flashcards
                         </button>
                        <button class="btn btn-primary btn-sm" onclick="app.showTestOptions('${note.id}')">
                            <i class="fas fa-file-alt"></i> Test
                        </button>
                         <button class="btn btn-outline btn-sm" onclick="app.editNote('${note.id}')">
                             <i class="fas fa-edit"></i> Edit
                         </button>
                         <button class="btn btn-outline btn-sm" onclick="app.viewNote('${note.id}')">
                             <i class="fas fa-eye"></i> View
                         </button>
                         <button class="btn btn-outline btn-sm" onclick="app.deleteNote('${note.id}')">
                             <i class="fas fa-trash"></i>
                         </button>
                         <button class="btn btn-download btn-sm" onclick="app.downloadNote('${note.id}')">
                             <i class="fas fa-download"></i>
                         </button>
                     </div>
                </div>
                <div class="note-meta">
                    Created: ${new Date(note.createdAt).toLocaleString()}
                </div>
                 <div class="note-preview">
                     ${this.escapeHtml(note.content.substring(0, 200))}${note.content.length > 200 ? '...' : ''}
                 </div>
             `;
             notesList.appendChild(noteItem);
         });

         // Display flashcard sets
         if (project.flashcardSets && project.flashcardSets.length > 0) {
             const flashcardSection = document.createElement('div');
             flashcardSection.className = 'flashcard-section';
             flashcardSection.innerHTML = `
                 <h3 style="color: #e0e0e0; margin: 2rem 0 1rem 0; font-size: 1.3rem;">
                     <i class="fas fa-layer-group" style="color: #4a9eff; margin-right: 0.5rem;"></i>
                     Flashcard Sets
                 </h3>
             `;
             notesList.appendChild(flashcardSection);

             project.flashcardSets.forEach(flashcardSet => {
                 const flashcardItem = document.createElement('div');
                 flashcardItem.className = 'flashcard-set-item fade-in';
                 flashcardItem.innerHTML = `
                     <div class="flashcard-set-header">
                         <h4 class="flashcard-set-title">${this.escapeHtml(flashcardSet.title)}</h4>
                         <span class="flashcard-count">${flashcardSet.flashcards.length} cards</span>
                     </div>
                     <div class="flashcard-set-meta">
                         Created: ${new Date(flashcardSet.createdAt).toLocaleString()}
                     </div>
                     <div class="flashcard-actions">
                         <button class="btn btn-primary btn-sm" onclick="app.showFlashcardStudy('${flashcardSet.id}')">
                             <i class="fas fa-play"></i> Study
                         </button>
                         <button class="btn btn-outline btn-sm" onclick="app.deleteFlashcardSet('${flashcardSet.id}')">
                             <i class="fas fa-trash"></i> Delete
                         </button>
                     </div>
                 `;
                 notesList.appendChild(flashcardItem);
             });
         }
     }

    updateProjectSelect() {
        const projectSelect = document.getElementById('projectSelect');
        projectSelect.innerHTML = '<option value="">Choose a project...</option>';

        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });
    }

    // ===== Test Generation =====
    showTestOptions(noteId) {
        // Check if user is logged in
        if (!this.isAuthenticated) {
            this.showNotification('Please log in to generate tests', 'error');
            this.showLoginModal();
            return;
        }
        
        this.currentNoteForTest = this.findNoteById(noteId);
        if (!this.currentNoteForTest) {
            this.showNotification('Note not found', 'error');
            return;
        }
        document.getElementById('testOptionsModal').classList.add('active');
    }

    hideTestOptionsModal() {
        document.getElementById('testOptionsModal').classList.remove('active');
    }

    async confirmTestGeneration() {
        if (!this.currentNoteForTest) {
            alert('No note selected');
            return;
        }

        const includeMCQ = document.getElementById('optMCQ').checked;
        const includeTF = document.getElementById('optTF').checked;
        const includeSA = document.getElementById('optSA').checked;

        if (!includeMCQ && !includeTF && !includeSA) {
            alert('Please select at least one question type');
            return;
        }

        this.hideTestOptionsModal();
        this.showLoading(true);
        try {
            const testContent = await this.generateTestWithAI({
                noteText: this.currentNoteForTest.content,
                includeMCQ, includeTF, includeSA
            });
            this.showGeneratedTest(testContent, this.currentNoteForTest.title);
        } catch (e) {
            console.error('Error generating test:', e);
            alert(`Failed to generate test: ${e.message}\n\nPlease try again. Make sure your notes contain enough content to generate questions.`);
        } finally {
            this.showLoading(false);
        }
    }

    async generateTestWithAI(options) {
        const { noteText, includeMCQ, includeTF, includeSA } = options;
        
        console.log('Generating test with notes content:', noteText.substring(0, 200) + '...');
        console.log('Question types requested:', { includeMCQ, includeTF, includeSA });
        
        // Check if user has a valid API key
        if (!CONFIG || !CONFIG.hasValidApiKey()) {
            throw new Error('API key not configured. Please log in and set your Gemini API key in the API Key settings.');
        }

        const apiKey = CONFIG.GEMINI_API_KEY;
        const apiUrl = `${CONFIG.API_URL}?key=${apiKey}`;
        
        console.log('API URL being called:', apiUrl);
        console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');

        const sections = [];
        if (includeMCQ) sections.push(`Multiple Choice: Provide question, and 4 options labeled A-D, with one correct answer.`);
        if (includeTF) sections.push(`True/False: Provide clear statements that are unambiguously true or false.`);
        if (includeSA) sections.push(`Short Answer: Ask concise questions requiring 1-3 sentence answers.`);

        const prompt = `You are an expert test creator. Create a test from the user's notes below.

CRITICAL REQUIREMENTS:
1. Respond with ONLY valid JSON - no explanations, no markdown, no additional text
2. Do NOT include trailing commas in arrays or objects
3. Ensure all JSON syntax is perfectly valid
4. Use the exact format specified below

Required JSON format:
{
  "mcq": [{"q": "question text", "options": ["A. option1", "B. option2", "C. option3", "D. option4"], "answer": "A"}],
  "trueFalse": [{"q": "statement", "answer": true}],
  "shortAnswer": [{"q": "question", "answer": "example answer"}]
}

Rules:
- Only include sections that are selected below
- MCQ: exactly 4 options labeled A-D, answer is the letter
- True/False: answer is boolean true/false
- Short Answer: answer is a concise example
- Generate questions per selected section (max 50 total)
- JSON must be valid and parseable with NO trailing commas

Selected sections to generate:
${sections.join('\n')}

User Notes:
${noteText}

Respond with ONLY the JSON object:`;

        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        console.log('Response status text:', response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`API request failed: ${response.status} ${response.statusText}. Response: ${errorText}`);
        }
        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }
        const raw = data.candidates[0].content.parts[0].text.trim();
        console.log('Raw AI response:', raw);
        
        // extract JSON if the model wrapped it
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        let jsonText = start !== -1 && end !== -1 ? raw.substring(start, end + 1) : raw;
        
        // Comprehensive JSON cleaning - handle all trailing comma patterns
        console.log('Starting JSON cleaning...');
        
        // First, handle the most common pattern: trailing comma before "answer"
        jsonText = jsonText.replace(/"([^"]+)",\s*\n\s*"answer":\s*"([^"]+)"/g, '"$1"\n      ],\n      "answer": "$2"');
        jsonText = jsonText.replace(/"([^"]+)",\s*\n\s*"answer":\s*(true|false)/g, '"$1"\n      ],\n      "answer": $2');
        
        // Handle trailing commas before closing brackets/braces
        jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
        jsonText = jsonText.replace(/,(\s*\])/g, '$1');
        jsonText = jsonText.replace(/,(\s*\})/g, '$1');
        
        // Handle trailing commas before "q" (next question)
        jsonText = jsonText.replace(/"([^"]+)",\s*\n\s*"q":/g, '"$1"\n      ],\n      "q":');
        
        // Handle trailing commas before closing of arrays/objects
        jsonText = jsonText.replace(/,(\s*\n\s*[}\]])/g, '$1');
        jsonText = jsonText.replace(/,(\s*\n\s*\])/g, '$1');
        jsonText = jsonText.replace(/,(\s*\n\s*\})/g, '$1');
        
        // Multiple aggressive passes to catch all patterns
        for (let i = 0; i < 10; i++) {
            jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
            jsonText = jsonText.replace(/,(\s*\n\s*[}\]])/g, '$1');
        }
        
        console.log('JSON cleaning completed');
        
        console.log('Cleaned JSON:', jsonText);
        console.log('Cleaned JSON length:', jsonText.length);
        
        // Debug: Show the problematic area around position 262
        if (jsonText.length > 262) {
            console.log('Around position 262:', jsonText.substring(250, 280));
        }
        
        // Final aggressive cleanup - handle the exact pattern from the error
        // This fixes: "D. The Four Noble Truths",\n      "answer": "B" -> "D. The Four Noble Truths"\n      ]\n      "answer": "B"
        jsonText = jsonText.replace(/"([^"]+)",\s*\n\s*"answer"/g, '"$1"\n      ]\n      "answer"');
        
        // Also fix: "D. The Four Noble Truths",\n      ]
        jsonText = jsonText.replace(/"([^"]+)",\s*\n\s*\]/g, '"$1"\n      ]');
        
        // And: "D. The Four Noble Truths",\n      }
        jsonText = jsonText.replace(/"([^"]+)",\s*\n\s*\}/g, '"$1"\n      }');
        
        // Fix missing commas in trueFalse and shortAnswer sections
        jsonText = jsonText.replace(/"([^"]+)",\s*\n\s*"answer":\s*(true|false)/g, '"$1",\n      "answer": $2');
        jsonText = jsonText.replace(/"([^"]+)",\s*\n\s*"answer":\s*"([^"]+)"/g, '"$1",\n      "answer": "$2"');
        
        // Final debug: Show the cleaned JSON before parsing
        console.log('Final JSON before parsing:', jsonText.substring(0, 500) + '...');
        console.log('Full cleaned JSON:', jsonText);
        
        let parsed;
        try {
            parsed = JSON.parse(jsonText);
            console.log('Parsed test data:', parsed);
            
            // Validate that we have actual questions (minimum 1 question total)
            const mcqCount = parsed.mcq ? parsed.mcq.length : 0;
            const tfCount = parsed.trueFalse ? parsed.trueFalse.length : 0;
            const saCount = parsed.shortAnswer ? parsed.shortAnswer.length : 0;
            const totalQuestions = mcqCount + tfCount + saCount;
            
            console.log(`Question counts - MCQ: ${mcqCount}, True/False: ${tfCount}, Short Answer: ${saCount}, Total: ${totalQuestions}`);
            
            if (totalQuestions < 1) {
                throw new Error('AI response does not contain any valid questions. Please try again.');
            }
            
        } catch (e) {
            console.error('Failed to parse test JSON', e);
            console.error('Raw response:', raw);
            console.error('Extracted JSON:', jsonText);
            
            // Try one more aggressive cleanup approach
            console.log('Attempting final JSON cleanup...');
            try {
                // Remove all trailing commas more aggressively
                jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
                jsonText = jsonText.replace(/,(\s*\n\s*[}\]])/g, '$1');
                jsonText = jsonText.replace(/,(\s*\n\s*\])/g, '$1');
                jsonText = jsonText.replace(/,(\s*\n\s*\})/g, '$1');
                
                // Try parsing again
                parsed = JSON.parse(jsonText);
                console.log('Successfully parsed after final cleanup!');
            } catch (e2) {
                console.error('Final cleanup also failed:', e2);
                throw new Error(`Failed to parse AI response as valid JSON. Please try generating the test again. The AI response may have formatting issues.`);
            }
        }
        return parsed;
    }


    showGeneratedTest(testJson, title) {
        console.log('showGeneratedTest called with:', testJson, title);
        document.getElementById('testViewTitle').textContent = `${title} - Generated Test`;
        
        // Prepare quiz questions
        this.quizQuestions = [];
        this.currentQuizIndex = 0;
        this.quizResponses = {};
        this.quizSubmitted = false;
        
        // Flatten all questions into a single array
        console.log('testJson structure:', testJson);
        console.log('testJson.mcq:', testJson.mcq);
        console.log('testJson.trueFalse:', testJson.trueFalse);
        console.log('testJson.shortAnswer:', testJson.shortAnswer);
        
        if (testJson.mcq && Array.isArray(testJson.mcq)) {
            testJson.mcq.forEach((item, idx) => {
                console.log('Adding MCQ question:', item);
                this.quizQuestions.push({
                    type: 'mcq',
                    question: item.q,
                    options: item.options,
                    correctAnswer: item.answer,
                    id: `mcq-${idx}`
                });
            });
        }
        
        if (testJson.trueFalse && Array.isArray(testJson.trueFalse)) {
            testJson.trueFalse.forEach((item, idx) => {
                console.log('Adding True/False question:', item);
                this.quizQuestions.push({
                    type: 'trueFalse',
                    question: item.q,
                    correctAnswer: item.answer,
                    id: `tf-${idx}`
                });
            });
        }
        
        if (testJson.shortAnswer && Array.isArray(testJson.shortAnswer)) {
            testJson.shortAnswer.forEach((item, idx) => {
                console.log('Adding Short Answer question:', item);
                this.quizQuestions.push({
                    type: 'shortAnswer',
                    question: item.q,
                    correctAnswer: item.answer,
                    id: `sa-${idx}`
                });
            });
        }
        
        console.log('Final quizQuestions array:', this.quizQuestions);
        
        // If no questions were parsed, try to extract from different format
        if (this.quizQuestions.length === 0) {
            console.log('No questions found, trying alternative parsing...');
            this.parseAlternativeFormat(testJson);
        }
        
        this.currentInteractiveTest = testJson;
        this.currentTestResponses = {};
        
        // Show initial view with Start Quiz button
        this.showQuizInitialView();
        
        // Ensure quiz container is hidden initially
        const quizContainer = document.getElementById('quizContainer');
        const quizProgress = document.getElementById('quizProgress');
        const quizNavigation = document.getElementById('quizNavigation');
        
        if (quizContainer) quizContainer.style.display = 'none';
        if (quizProgress) quizProgress.style.display = 'none';
        if (quizNavigation) quizNavigation.style.display = 'none';
        
        // Show the modal
        const testViewModal = document.getElementById('testViewModal');
        if (testViewModal) {
            testViewModal.classList.add('active');
            console.log('Test view modal activated');
        } else {
            console.error('Test view modal not found!');
        }
    }
    
    parseAlternativeFormat(testJson) {
        console.log('Attempting alternative format parsing...');
        // Try to parse if the response is in a different format
        // This is a fallback for when the AI returns unexpected JSON structure
        try {
            // Check if it's a string that needs parsing
            if (typeof testJson === 'string') {
                const parsed = JSON.parse(testJson);
                this.showGeneratedTest(parsed, document.getElementById('testViewTitle').textContent.replace(' - Generated Test', ''));
                return;
            }
            
            // Check for alternative property names
            const altProperties = ['multipleChoice', 'true_false', 'short_answer', 'questions'];
            for (const prop of altProperties) {
                if (testJson[prop]) {
                    console.log(`Found alternative property: ${prop}`, testJson[prop]);
                    // Convert to expected format
                    if (prop === 'multipleChoice') {
                        testJson.mcq = testJson[prop];
                    } else if (prop === 'true_false') {
                        testJson.trueFalse = testJson[prop];
                    } else if (prop === 'short_answer') {
                        testJson.shortAnswer = testJson[prop];
                    }
                }
            }
            
            // Try parsing again with converted format
            if (testJson.mcq || testJson.trueFalse || testJson.shortAnswer) {
                this.showGeneratedTest(testJson, document.getElementById('testViewTitle').textContent.replace(' - Generated Test', ''));
                return;
            }
            
            // If still no questions, throw an error
            console.log('No questions found after alternative parsing');
            throw new Error('Unable to extract questions from AI response. Please try generating the test again.');
            
        } catch (error) {
            console.error('Alternative parsing failed:', error);
            throw new Error('Failed to parse AI response. Please try generating the test again.');
        }
    }
    
    showQuizInitialView() {
        console.log('showQuizInitialView called, quizQuestions length:', this.quizQuestions.length);
        // Hide quiz interface
        document.getElementById('quizProgress').style.display = 'none';
        document.getElementById('quizContainer').style.display = 'none';
        document.getElementById('quizNavigation').style.display = 'none';
        
        // Clear quiz container content
        const quizContainer = document.getElementById('quizContainer');
        if (quizContainer) {
            quizContainer.innerHTML = '';
        }
        
        // Show all questions view
        const container = document.getElementById('testViewContent');
        if (container) {
            container.innerHTML = '';
            container.style.display = 'block';
        }
        
        // Show question preview
        const preview = document.createElement('div');
        preview.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <h3 style="color: #4a9eff; margin-bottom: 1rem;">📝 Test Ready!</h3>
                <p style="color: #a0a0a0; font-size: 1.1rem;">
                    You have ${this.quizQuestions.length} questions to answer.<br>
                    Click "Start Quiz" to begin the interactive quiz experience.
                </p>
            </div>
        `;
        if (container) {
            container.appendChild(preview);
        }
        
        // Reset all button states
        const startBtn = document.getElementById('startQuizBtn');
        const submitBtn = document.getElementById('submitTestBtn');
        const showBtn = document.getElementById('showAnswersBtn');
        const retakeBtn = document.getElementById('retakeTestBtn');
        
        if (startBtn) startBtn.style.display = 'inline-block';
        if (submitBtn) submitBtn.style.display = 'none';
        if (showBtn) showBtn.style.display = 'none';
        if (retakeBtn) retakeBtn.style.display = 'none';
        
        // Reset quiz state
        this.quizSubmitted = false;
        this.currentQuizIndex = 0;
        this.quizResponses = {};
    }

    submitInteractiveTest() {
        if (!this.currentInteractiveTest) return;
        let total = 0;
        let correct = 0;
        const check = (label, items, checker) => {
            if (!items) return;
            items.forEach((item, idx) => {
                total++;
                const qId = `${label}-${idx}`;
                if (checker(item, this.currentTestResponses[qId])) correct++;
            });
        };
        check('Multiple Choice', this.currentInteractiveTest.mcq, (item, resp) => resp && item.answer && resp.toUpperCase() === String(item.answer).toUpperCase());
        check('True/False', this.currentInteractiveTest.trueFalse, (item, resp) => typeof resp === 'boolean' && (item.answer === true || item.answer === false) && resp === item.answer);
        check('Short Answer', this.currentInteractiveTest.shortAnswer, (item, resp) => typeof resp === 'string' && resp.length > 0);

        const scoreEl = document.getElementById('testScoreDisplay');
        scoreEl.textContent = `Score: ${correct} / ${total}`;
    }

    showTestAnswers() {
        if (!this.currentInteractiveTest) return;
        const container = document.getElementById('testViewContent');
        // Append answers section
        const answers = document.createElement('div');
        answers.className = 'test-section-title';
        answers.textContent = 'Answers';
        container.appendChild(answers);

        const addList = (label, items, fmt) => {
            if (!items || items.length === 0) return;
            const head = document.createElement('div');
            head.style.margin = '0.5rem 0 0.25rem 0';
            head.textContent = label;
            head.style.color = '#a0a0a0';
            container.appendChild(head);
            items.forEach((it, i) => {
                const p = document.createElement('div');
                p.style.fontSize = '0.95rem';
                p.style.marginBottom = '0.25rem';
                p.textContent = `${i + 1}. ${fmt(it)}`;
                container.appendChild(p);
            });
        };
        addList('Multiple Choice', this.currentInteractiveTest.mcq, it => `Answer: ${it.answer}`);
        addList('True/False', this.currentInteractiveTest.trueFalse, it => `Answer: ${it.answer === true ? 'True' : 'False'}`);
        addList('Short Answer', this.currentInteractiveTest.shortAnswer, it => `Example: ${it.answer}`);
    }

    retakeInteractiveTest() {
        if (!this.currentInteractiveTest) return;
        this.showGeneratedTest(this.currentInteractiveTest, document.getElementById('testViewTitle').textContent.replace(' - Generated Test',''));
    }
    
    // Quiz interface methods
    startQuiz() {
        console.log('Starting quiz with', this.quizQuestions.length, 'questions');
        
        // Hide initial view
        const testViewContent = document.getElementById('testViewContent');
        const startQuizBtn = document.getElementById('startQuizBtn');
        if (testViewContent) testViewContent.style.display = 'none';
        if (startQuizBtn) startQuizBtn.style.display = 'none';
        
        // Show quiz interface
        const quizProgress = document.getElementById('quizProgress');
        const quizContainer = document.getElementById('quizContainer');
        const quizNavigation = document.getElementById('quizNavigation');
        
        if (quizProgress) quizProgress.style.display = 'block';
        if (quizContainer) quizContainer.style.display = 'block';
        if (quizNavigation) quizNavigation.style.display = 'flex';
        
        // Wait a moment for DOM to update, then check quiz elements
        setTimeout(() => {
            // Force the quiz container to be visible first
            const quizContainer = document.getElementById('quizContainer');
            if (quizContainer) {
                quizContainer.style.display = 'block';
                quizContainer.style.visibility = 'visible';
            }
            
            const questionEl = document.getElementById('quizQuestion');
            const optionsEl = document.getElementById('quizOptions');
            const answerEl = document.getElementById('quizAnswer');
            
            console.log('Quiz elements:', { questionEl, optionsEl, answerEl });
            console.log('Quiz container:', quizContainer);
            console.log('Quiz container display:', quizContainer ? quizContainer.style.display : 'not found');
            
            if (!questionEl || !optionsEl || !answerEl) {
                console.error('Quiz elements missing from DOM');
                console.log('Available elements:', {
                    quizContainer: document.getElementById('quizContainer'),
                    quizQuestion: document.getElementById('quizQuestion'),
                    quizOptions: document.getElementById('quizOptions'),
                    quizAnswer: document.getElementById('quizAnswer')
                });
                
                // Try to create the elements if they don't exist
                if (!questionEl || !optionsEl || !answerEl) {
                    this.createQuizElements();
                    
                    // Re-check elements after creation
                    const newQuestionEl = document.getElementById('quizQuestion');
                    const newOptionsEl = document.getElementById('quizOptions');
                    const newAnswerEl = document.getElementById('quizAnswer');
                    
                    console.log('Elements after creation:', { newQuestionEl, newOptionsEl, newAnswerEl });
                    
                    if (!newQuestionEl || !newOptionsEl || !newAnswerEl) {
                        alert('Quiz interface not properly loaded. Please refresh and try again.');
                        return;
                    }
                }
            }
            
            // Update progress
            this.updateQuizProgress();
            
            // Show first question
            this.showCurrentQuestion();
        }, 200); // Increased timeout
    }
    
    createQuizElements() {
        console.log('Creating quiz elements as fallback...');
        const quizContainer = document.getElementById('quizContainer');
        if (!quizContainer) {
            console.error('Quiz container not found, cannot create elements');
            return false;
        }
        
        console.log('Quiz container found:', quizContainer);
        
        // Create question element if it doesn't exist
        if (!document.getElementById('quizQuestion')) {
            const questionEl = document.createElement('div');
            questionEl.id = 'quizQuestion';
            questionEl.className = 'quiz-question';
            questionEl.textContent = 'Loading question...';
            quizContainer.appendChild(questionEl);
            console.log('Created quizQuestion element');
        }
        
        // Create options element if it doesn't exist
        if (!document.getElementById('quizOptions')) {
            const optionsEl = document.createElement('div');
            optionsEl.id = 'quizOptions';
            optionsEl.className = 'quiz-options';
            quizContainer.appendChild(optionsEl);
            console.log('Created quizOptions element');
        }
        
        // Create answer element if it doesn't exist
        if (!document.getElementById('quizAnswer')) {
            const answerEl = document.createElement('div');
            answerEl.id = 'quizAnswer';
            answerEl.className = 'quiz-answer';
            answerEl.style.display = 'none';
            quizContainer.appendChild(answerEl);
            console.log('Created quizAnswer element');
        }
        
        // Verify elements were created
        const createdQuestion = document.getElementById('quizQuestion');
        const createdOptions = document.getElementById('quizOptions');
        const createdAnswer = document.getElementById('quizAnswer');
        
        console.log('Elements after creation:', { createdQuestion, createdOptions, createdAnswer });
        
        return createdQuestion && createdOptions && createdAnswer;
    }
    
    showConfetti() {
        // Create confetti effect
        const confettiContainer = document.createElement('div');
        confettiContainer.style.position = 'fixed';
        confettiContainer.style.top = '0';
        confettiContainer.style.left = '0';
        confettiContainer.style.width = '100%';
        confettiContainer.style.height = '100%';
        confettiContainer.style.pointerEvents = 'none';
        confettiContainer.style.zIndex = '9999';
        document.body.appendChild(confettiContainer);
        
        // Create confetti particles
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
        const particleCount = 50;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.width = '10px';
            particle.style.height = '10px';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.borderRadius = '50%';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = '-10px';
            particle.style.animation = `confettiFall ${Math.random() * 3 + 2}s linear forwards`;
            confettiContainer.appendChild(particle);
        }
        
        // Remove confetti after animation
        setTimeout(() => {
            document.body.removeChild(confettiContainer);
        }, 5000);
    }
    
    showCurrentQuestion() {
        if (this.currentQuizIndex >= this.quizQuestions.length) {
            console.log('No more questions, currentQuizIndex:', this.currentQuizIndex, 'quizQuestions.length:', this.quizQuestions.length);
            return;
        }
        
        if (!this.quizQuestions || this.quizQuestions.length === 0) {
            console.error('No quiz questions available');
            return;
        }
        
        const question = this.quizQuestions[this.currentQuizIndex];
        console.log('Showing question:', question);
        const questionEl = document.getElementById('quizQuestion');
        const optionsEl = document.getElementById('quizOptions');
        const answerEl = document.getElementById('quizAnswer');
        
        // Check if elements exist
        if (!questionEl || !optionsEl || !answerEl) {
            console.error('Quiz elements not found:', { questionEl, optionsEl, answerEl });
            return;
        }
        
        // Clear previous content and highlighting
        optionsEl.innerHTML = '';
        answerEl.style.display = 'none';
        
        // Clear any existing highlighting classes
        const existingOptions = optionsEl.querySelectorAll('.quiz-option');
        existingOptions.forEach(opt => {
            opt.classList.remove('correct', 'incorrect', 'selected');
        });
        
        // Show question
        questionEl.textContent = question.question;
        
        // Get previous response for this question
        const previousResponse = this.quizResponses[question.id];
        
        // Show options based on question type
        if (question.type === 'mcq') {
            question.options.forEach((option, index) => {
                const optionEl = document.createElement('div');
                optionEl.className = 'quiz-option';
                optionEl.textContent = option;
                
                // Restore previous selection and highlighting
                if (previousResponse === option) {
                    optionEl.classList.add('selected');
                    
                    // Check if this was the correct answer
                    const isCorrect = this.isAnswerCorrect(question, option);
                    if (isCorrect) {
                        optionEl.classList.add('correct');
                    } else {
                        optionEl.classList.add('incorrect');
                    }
                }
                
                optionEl.addEventListener('click', () => this.selectOption(optionEl, option));
                optionsEl.appendChild(optionEl);
            });
        } else if (question.type === 'trueFalse') {
            ['True', 'False'].forEach(option => {
                const optionEl = document.createElement('div');
                optionEl.className = 'quiz-option';
                optionEl.textContent = option;
                
                // Restore previous selection and highlighting
                if (previousResponse === option.toLowerCase()) {
                    optionEl.classList.add('selected');
                    
                    // Check if this was the correct answer
                    const isCorrect = this.isAnswerCorrect(question, option.toLowerCase());
                    if (isCorrect) {
                        optionEl.classList.add('correct');
                    } else {
                        optionEl.classList.add('incorrect');
                    }
                }
                
                optionEl.addEventListener('click', () => this.selectOption(optionEl, option.toLowerCase()));
                optionsEl.appendChild(optionEl);
            });
        } else if (question.type === 'shortAnswer') {
            const textarea = document.createElement('textarea');
            textarea.className = 'form-control';
            textarea.rows = 4;
            textarea.placeholder = 'Type your answer here...';
            textarea.style.width = '100%';
            textarea.style.marginTop = '1rem';
            
            // Restore previous text
            if (previousResponse) {
                textarea.value = previousResponse;
            }
            
            textarea.addEventListener('input', (e) => {
                this.quizResponses[question.id] = e.target.value.trim();
            });
            optionsEl.appendChild(textarea);
        }
        
        // Update navigation buttons
        this.updateQuizNavigation();
    }
    
    selectOption(optionEl, value) {
        // Remove previous selection
        const options = optionEl.parentElement.querySelectorAll('.quiz-option');
        options.forEach(opt => opt.classList.remove('selected'));
        
        // Add selection to clicked option
        optionEl.classList.add('selected');
        
        // Store response
        const question = this.quizQuestions[this.currentQuizIndex];
        this.quizResponses[question.id] = value;
        
        // Check if answer is correct and highlight
        const isCorrect = this.isAnswerCorrect(question, value);
        console.log('Answer validation:', { 
            userAnswer: value, 
            correctAnswer: question.correctAnswer, 
            isCorrect: isCorrect,
            questionType: question.type 
        });
        
        // Highlight correct answer in green
        options.forEach(opt => {
            if (question.type === 'mcq') {
                const optionText = opt.textContent;
                const correctOptionIndex = ['A', 'B', 'C', 'D'].indexOf(question.correctAnswer);
                const correctOption = question.options[correctOptionIndex];
                if (optionText === correctOption) {
                    opt.classList.add('correct');
                }
            } else if (question.type === 'trueFalse') {
                const optionText = opt.textContent.toLowerCase();
                const correctAnswer = question.correctAnswer ? 'true' : 'false';
                if (optionText === correctAnswer) {
                    opt.classList.add('correct');
                }
            }
        });
        
        // Highlight user's answer if incorrect
        if (!isCorrect) {
            optionEl.classList.add('incorrect');
        } else {
            // Show confetti for correct answer
            this.showConfetti();
        }
        
        // Enable next button instead of auto-advance
        const nextBtn = document.getElementById('nextQuestionBtn');
        const finishBtn = document.getElementById('finishQuizBtn');
        
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.style.display = 'inline-block';
        }
        
        if (finishBtn && this.currentQuizIndex === this.quizQuestions.length - 1) {
            finishBtn.disabled = false;
            finishBtn.style.display = 'inline-block';
        }
    }
    
    updateQuizProgress() {
        const progressFill = document.querySelector('.progress-fill');
        const currentNum = document.getElementById('currentQuestionNum');
        const totalNum = document.getElementById('totalQuestions');
        
        const progress = ((this.currentQuizIndex + 1) / this.quizQuestions.length) * 100;
        progressFill.style.width = `${progress}%`;
        currentNum.textContent = this.currentQuizIndex + 1;
        totalNum.textContent = this.quizQuestions.length;
    }
    
    updateQuizNavigation() {
        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const finishBtn = document.getElementById('finishQuizBtn');
        
        if (prevBtn) prevBtn.disabled = this.currentQuizIndex === 0;
        
        if (this.currentQuizIndex === this.quizQuestions.length - 1) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (finishBtn) {
                finishBtn.style.display = 'inline-block';
                finishBtn.disabled = true; // Disabled until answer is selected
            }
        } else {
            if (nextBtn) {
                nextBtn.style.display = 'inline-block';
                nextBtn.disabled = true; // Disabled until answer is selected
            }
            if (finishBtn) finishBtn.style.display = 'none';
        }
    }
    
    previousQuestion() {
        if (this.currentQuizIndex > 0) {
            this.currentQuizIndex--;
            this.updateQuizProgress();
            this.showCurrentQuestion();
        }
    }
    
    nextQuestion() {
        if (this.currentQuizIndex < this.quizQuestions.length - 1) {
            this.currentQuizIndex++;
            this.updateQuizProgress();
            this.showCurrentQuestion();
        }
    }
    
    finishQuiz() {
        // Calculate score
        let correct = 0;
        let total = this.quizQuestions.length;
        
        this.quizQuestions.forEach(question => {
            const userAnswer = this.quizResponses[question.id];
            if (this.isAnswerCorrect(question, userAnswer)) {
                correct++;
            }
        });
        
        // Show results
        this.showQuizResults(correct, total);
    }
    
    isAnswerCorrect(question, userAnswer) {
        if (question.type === 'mcq') {
            // For MCQ, compare the actual option text, not just the letter
            const correctOptionIndex = ['A', 'B', 'C', 'D'].indexOf(question.correctAnswer);
            const correctOption = question.options[correctOptionIndex];
            return userAnswer === correctOption;
        } else if (question.type === 'trueFalse') {
            // For True/False, compare boolean values
            const userBool = userAnswer === 'true';
            return userBool === question.correctAnswer;
        } else if (question.type === 'shortAnswer') {
            // For short answer, just check if user provided an answer
            return userAnswer && userAnswer.length > 0;
        }
        return false;
    }
    
    showQuizResults(correct, total) {
        const percentage = Math.round((correct / total) * 100);
        const container = document.getElementById('quizContainer');
        
        // Choose emoji and message based on performance
        let emoji = '🎉';
        let color = '#10b981';
        let message = 'Excellent work!';
        let encouragement = 'You mastered this material!';
        
        if (percentage < 50) {
            emoji = '📚';
            color = '#f59e0b';
            message = 'Keep studying!';
            encouragement = 'Review the material and try again!';
        } else if (percentage < 70) {
            emoji = '👍';
            color = '#3b82f6';
            message = 'Good job!';
            encouragement = 'You\'re on the right track!';
        } else if (percentage < 90) {
            emoji = '🌟';
            color = '#8b5cf6';
            message = 'Great work!';
            encouragement = 'You have a solid understanding!';
        } else {
            emoji = '🏆';
            color = '#10b981';
            message = 'Outstanding!';
            encouragement = 'Perfect score! You\'re a quiz master!';
        }
        
        // Show confetti for high scores
        if (percentage >= 80) {
            this.showConfetti();
        }
        
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 5rem; margin-bottom: 1rem; animation: bounce 1s ease-in-out;">${emoji}</div>
                <h1 style="color: #4a9eff; margin-bottom: 1rem; font-size: 2.5rem;">${message}</h1>
                <h2 style="color: #a0a0a0; margin-bottom: 2rem; font-size: 1.5rem;">Quiz Complete!</h2>
                
                <!-- Score Display -->
                <div style="background: linear-gradient(135deg, #2d2d2d 0%, #404040 100%); border: 3px solid ${color}; border-radius: 20px; padding: 2rem; margin: 2rem 0; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
                    <div style="font-size: 4rem; font-weight: bold; color: ${color}; margin-bottom: 0.5rem;">
                        ${correct} / ${total}
                    </div>
                    <div style="font-size: 2rem; color: #ffffff; margin-bottom: 1rem;">
                        ${percentage}% Correct
                    </div>
                    <div style="font-size: 1.2rem; color: #a0a0a0;">
                        You answered ${correct} out of ${total} questions correctly
                    </div>
                </div>
                
                <!-- Encouragement Message -->
                <div style="font-size: 1.3rem; color: #ffffff; margin-bottom: 2rem; font-weight: 500;">
                    ${encouragement}
                </div>
                
                <!-- Action Buttons -->
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="app.showQuizReview()" style="font-size: 1.1rem; padding: 0.8rem 1.5rem;">
                        <i class="fas fa-eye"></i> Review Answers
                    </button>
                    <button class="btn btn-secondary" onclick="app.retakeInteractiveTest()" style="font-size: 1.1rem; padding: 0.8rem 1.5rem;">
                        <i class="fas fa-redo"></i> Retake Quiz
                    </button>
                </div>
            </div>
        `;
        
        // Hide navigation
        const quizNavigation = document.getElementById('quizNavigation');
        if (quizNavigation) quizNavigation.style.display = 'none';
        
        // Show review buttons
        const showAnswersBtn = document.getElementById('showAnswersBtn');
        const retakeTestBtn = document.getElementById('retakeTestBtn');
        if (showAnswersBtn) showAnswersBtn.style.display = 'inline-block';
        if (retakeTestBtn) retakeTestBtn.style.display = 'inline-block';
    }
    
    showQuizReview() {
        // Show all questions with correct answers highlighted
        const container = document.getElementById('testViewContent');
        container.innerHTML = '';
        container.style.display = 'block';
        
        // Hide quiz interface
        document.getElementById('quizProgress').style.display = 'none';
        document.getElementById('quizContainer').style.display = 'none';
        document.getElementById('quizNavigation').style.display = 'none';
        
        this.quizQuestions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'test-question';
            questionDiv.style.marginBottom = '2rem';
            
            const questionText = document.createElement('div');
            questionText.style.fontSize = '1.2rem';
            questionText.style.fontWeight = '600';
            questionText.style.marginBottom = '1rem';
            questionText.style.color = '#ffffff';
            questionText.textContent = `${index + 1}. ${question.question}`;
            questionDiv.appendChild(questionText);
            
            if (question.type === 'mcq') {
                const optionsDiv = document.createElement('div');
                optionsDiv.className = 'test-options';
                
                question.options.forEach((option, optIndex) => {
                    const letter = ['A', 'B', 'C', 'D'][optIndex];
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'quiz-option';
                    optionDiv.textContent = option;
                    
                    // Highlight correct answer
                    if (letter === String(question.correctAnswer).toUpperCase()) {
                        optionDiv.classList.add('correct');
                    }
                    
                    // Highlight user's answer if incorrect
                    const userAnswer = this.quizResponses[question.id];
                    if (userAnswer && letter === userAnswer.toUpperCase() && letter !== String(question.correctAnswer).toUpperCase()) {
                        optionDiv.classList.add('incorrect');
                    }
                    
                    optionsDiv.appendChild(optionDiv);
                });
                questionDiv.appendChild(optionsDiv);
            } else if (question.type === 'trueFalse') {
                const optionsDiv = document.createElement('div');
                optionsDiv.className = 'test-options';
                
                ['True', 'False'].forEach(option => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'quiz-option';
                    optionDiv.textContent = option;
                    
                    // Highlight correct answer
                    if ((option === 'True' && question.correctAnswer === true) || 
                        (option === 'False' && question.correctAnswer === false)) {
                        optionDiv.classList.add('correct');
                    }
                    
                    // Highlight user's answer if incorrect
                    const userAnswer = this.quizResponses[question.id];
                    if (userAnswer && option.toLowerCase() === userAnswer && option.toLowerCase() !== (question.correctAnswer ? 'true' : 'false')) {
                        optionDiv.classList.add('incorrect');
                    }
                    
                    optionsDiv.appendChild(optionDiv);
                });
                questionDiv.appendChild(optionsDiv);
            } else if (question.type === 'shortAnswer') {
                const userAnswer = this.quizResponses[question.id];
                const answerDiv = document.createElement('div');
                answerDiv.style.marginTop = '1rem';
                answerDiv.style.padding = '1rem';
                answerDiv.style.background = '#333';
                answerDiv.style.borderRadius = '8px';
                answerDiv.innerHTML = `
                    <div style="color: #a0a0a0; margin-bottom: 0.5rem;">Your answer:</div>
                    <div style="color: #ffffff; margin-bottom: 1rem;">${userAnswer || 'No answer provided'}</div>
                    <div style="color: #a0a0a0; margin-bottom: 0.5rem;">Example answer:</div>
                    <div style="color: #10b981;">${question.correctAnswer}</div>
                `;
                questionDiv.appendChild(answerDiv);
            }
            
            container.appendChild(questionDiv);
        });
    }

    hideTestViewModal() {
        document.getElementById('testViewModal').classList.remove('active');
        this.currentGeneratedTest = null;
    }

    downloadGeneratedTest() {
        if (!this.currentGeneratedTest) return;
        const content = `${this.currentGeneratedTest.title} - Test\n\n${this.currentGeneratedTest.content}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentGeneratedTest.title.replace(/[^\w\s]/g, '')}-Test.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    findNoteById(noteId) {
        for (const proj of this.projects) {
            const note = proj.notes.find(n => n.id === noteId);
            if (note) {
                this.currentProject = proj.id;
                return note;
            }
        }
        return null;
    }

    // AI Note Generation
    async generateNotes() {
        // Check if user is logged in
        if (!this.isAuthenticated) {
            this.showNotification('Please log in to generate notes', 'error');
            this.showLoginModal();
            return;
        }
        
        const transcription = document.getElementById('transcriptionText').value.trim();
        
        if (!transcription) {
            this.showNotification('Please enter some transcription text', 'error');
            return;
        }

        if (!this.currentProject) {
            this.showNotification('Please select a project first', 'error');
            return;
        }

        // Check for reasonable length (Gemini has token limits)
        if (transcription.length > CONFIG.MAX_CHARACTERS) {
            alert(`Transcription is too long. Please limit to under ${CONFIG.MAX_CHARACTERS.toLocaleString()} characters for best results.`);
            return;
        }

        this.showLoading(true);

        try {
            const notes = await this.processTranscriptionWithGemini(transcription);
            this.displayGeneratedNotes(notes);
            this.currentNote = notes;
            
            // Enable save and download buttons
            document.getElementById('saveNotesBtn').disabled = false;
            document.getElementById('downloadNotesBtn').disabled = false;
        } catch (error) {
            console.error('Error generating notes:', error);
            
            let errorMessage = 'Error generating notes. ';
            if (error.message.includes('API request failed: 400')) {
                errorMessage += 'The transcription might be too long or contain invalid content.';
            } else if (error.message.includes('API request failed: 403')) {
                errorMessage += 'API access denied. Please check your API key.';
            } else if (error.message.includes('API request failed: 429')) {
                errorMessage += 'Rate limit exceeded. Please wait a moment and try again.';
            } else if (error.message.includes('fetch')) {
                errorMessage += 'Please check your internet connection and try again.';
            } else {
                errorMessage += 'Please try again with a shorter transcription.';
            }
            
            alert(errorMessage);
        } finally {
            this.showLoading(false);
        }
    }

    async processTranscriptionWithGemini(text) {
        // Check if user has a valid API key
        if (!CONFIG || !CONFIG.hasValidApiKey()) {
            throw new Error('API key not configured. Please log in and set your Gemini API key in the API Key settings.');
        }

        const apiKey = CONFIG.GEMINI_API_KEY;
        const apiUrl = `${CONFIG.API_URL}?key=${apiKey}`;

        const prompt = `You are an expert academic note-taking assistant specializing in transforming transcriptions into comprehensive study notes.

Please analyze the following transcription and create well-structured study notes. Make sure all of the info is relevant to the topic. Sometimes their might be side conversations ignore those. use this format:

## Key Concepts
- List the main concepts, theories, tribes, empires, and important terminology
- Include definitions for technical terms when relevant
- make sure its all releveant to the same topic
- include any clubs,empires,or groups that are mentioned
- anything that might be important (that might be on a quiz)

## Important Facts & Details
- Extract key facts, data, statistics, or evidence presented
- Include dates, names, locations, or other specific details
- Note any formulas, equations, or technical specifications

## Other
- Include any additional relevant information that doesn't fit into the above categories
- Capture supplementary details, examples, or context that supports the main topic
- Note any related concepts, background information, or tangential but relevant points
- Include any additional terminology, processes, or methodologies mentioned
- Capture any other important information that should still be noted for comprehensive understanding

## Summary
- Provide a concise 2-3 sentence summary of the main content
- Highlight the most important takeaways

Guidelines:
- Use clear markdown formatting with ## for main headings and - for bullet points
- Be concise but comprehensive
- Focus on information most useful for studying and review
- Maintain academic tone and accuracy
- If the content is very technical, preserve important technical details
- The "Other" section should capture everything else that is still relevant and worth noting

Transcription to analyze:
${text}`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: CONFIG.GENERATION_CONFIG
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }

        const generatedContent = data.candidates[0].content.parts[0].text;
        
        // Extract title from the first line or generate one
        const lines = generatedContent.split('\n');
        const title = lines[0].replace(/^#+\s*/, '').trim() || this.generateTitle(text);
        
        return {
            title: title,
            content: generatedContent,
            createdAt: new Date().toISOString()
        };
    }

    generateTitle(text) {
        // Extract a meaningful title from the first few sentences
        const firstSentence = text.split(/[.!?]/)[0];
        const words = firstSentence.split(' ').slice(0, 8);
        return words.join(' ') + (firstSentence.split(' ').length > 8 ? '...' : '');
    }

    displayGeneratedNotes(notes) {
        const notesContainer = document.getElementById('generatedNotes');
        notesContainer.innerHTML = `
            <div class="notes-content">
                <h1>${this.escapeHtml(notes.title)}</h1>
                <div class="notes-text">${this.formatNotesForDisplay(notes.content)}</div>
            </div>
        `;
    }

    formatNotesForDisplay(content) {
        // Convert markdown-like formatting to HTML
        let html = content
            // Convert headers
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
            // Convert bold text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Convert italic text
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Convert bullet points
            .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
            // Convert numbered lists
            .replace(/^(\d+)\. (.+)$/gm, '<li>$1. $2</li>')
            // Convert line breaks
            .replace(/\n\n/g, '</p><p>')
            // Wrap remaining text in paragraphs
            .replace(/^(?!<[h|l])(.+)$/gm, '<p>$1</p>');

        // Fix list formatting
        html = html
            .replace(/<li>/g, '<ul><li>')
            .replace(/<\/li>/g, '</li></ul>')
            .replace(/<\/li><\/ul>\s*<ul><li>/g, '</li><li>')
            .replace(/<\/ul><\/p>/g, '</ul>')
            .replace(/<p><ul>/g, '<ul>');

        return html;
    }

    // Note saving and management
    saveNotes() {
        // Check if user is logged in
        if (!this.isAuthenticated) {
            this.showNotification('Please log in to save notes', 'error');
            this.showLoginModal();
            return;
        }
        
        if (!this.currentNote || !this.currentProject) {
            this.showNotification('No notes to save or no project selected', 'error');
            return;
        }

        const project = this.projects.find(p => p.id === this.currentProject);
        if (!project) {
            this.showNotification('Project not found', 'error');
            return;
        }

        // Show date assignment modal
        this.showDateModal();
    }

    showDateModal() {
        document.getElementById('dateModal').classList.add('active');
        
        // Set date - use pending date from calendar or today
        let dateToSet;
        if (this.pendingDate) {
            dateToSet = this.pendingDate.toISOString().split('T')[0];
        } else {
            dateToSet = new Date().toISOString().split('T')[0];
        }
        
        document.getElementById('noteDateInput').value = dateToSet;
        document.getElementById('noteTimeInput').value = '';
    }

    hideDateModal() {
        document.getElementById('dateModal').classList.remove('active');
    }

    confirmDateAssignment() {
        const dateInput = document.getElementById('noteDateInput').value;
        const timeInput = document.getElementById('noteTimeInput').value;
        
        if (!dateInput) {
            alert('Please select a date');
            return;
        }

        const project = this.projects.find(p => p.id === this.currentProject);
        if (!project) {
            alert('Project not found');
            return;
        }

        const noteId = Date.now().toString();
        const note = {
            id: noteId,
            title: this.currentNote.title,
            content: this.currentNote.content,
            createdAt: this.currentNote.createdAt,
            assignedDate: dateInput,
            assignedTime: timeInput || null,
            userId: this.currentUser.id // Associate note with user
        };

        project.notes.push(note);
        this.saveUserData();
        
        this.showNotification('Notes saved successfully with assigned date!', 'success');
        
        // Clear the current note
        this.currentNote = null;
        document.getElementById('saveNotesBtn').disabled = true;
        document.getElementById('downloadNotesBtn').disabled = true;
        document.getElementById('transcriptionText').value = '';
        this.updateCharCount();
        this.hideDateModal();
        
        // Clear pending date
        this.pendingDate = null;
    }

    // Download functionality
    downloadNotes() {
        if (!this.currentNote) {
            alert('No notes to download');
            return;
        }

        const content = `${this.currentNote.title}\n\n${this.currentNote.content}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentNote.title.replace(/[^\w\s]/gi, '')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadNote(noteId) {
        const project = this.projects.find(p => p.id === this.currentProject);
        if (!project) return;

        const note = project.notes.find(n => n.id === noteId);
        if (!note) return;

        const content = `${note.title}\n\n${note.content}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title.replace(/[^\w\s]/gi, '')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Rename functionality
    showRenameModal(type) {
        document.getElementById('renameModal').classList.add('active');
        document.getElementById('renameModalTitle').textContent = `Rename ${type}`;
        document.getElementById('renameInput').focus();
        
        // Store the type for later use
        document.getElementById('renameModal').dataset.type = type;
    }

    hideRenameModal() {
        document.getElementById('renameModal').classList.remove('active');
        document.getElementById('renameInput').value = '';
    }

    confirmRename() {
        const newName = document.getElementById('renameInput').value.trim();
        const type = document.getElementById('renameModal').dataset.type;

        if (!newName) {
            alert('Please enter a new name');
            return;
        }

        if (type === 'project') {
            this.renameProject(this.currentProject, newName);
        } else if (type === 'note') {
            this.renameNote(this.currentNote, newName);
        }

        this.hideRenameModal();
    }

    renameProject(projectId, newName) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        if (this.projects.some(p => p.id !== projectId && p.name.toLowerCase() === newName.toLowerCase())) {
            alert('A project with this name already exists');
            return;
        }

        project.name = newName;
        this.saveUserData();
        this.updateProjectsList();
        this.updateProjectSelect();
        
        if (this.currentView === 'projectNotes') {
            document.getElementById('projectTitle').textContent = newName;
        }
    }

    renameNote(noteId, newName) {
        const project = this.projects.find(p => p.id === this.currentProject);
        if (!project) return;

        const note = project.notes.find(n => n.id === noteId);
        if (!note) return;

        note.title = newName;
        this.saveUserData();
        this.updateProjectNotesView();
    }

    // Delete functionality
    deleteProject(projectId) {
        if (confirm('Are you sure you want to delete this project? All notes will be lost.')) {
            this.projects = this.projects.filter(p => p.id !== projectId);
            this.saveUserData();
            this.updateProjectsList();
            this.updateProjectSelect();
            
            if (this.currentProject === projectId) {
                this.showView('dashboard');
            }
        }
    }

    deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            const project = this.projects.find(p => p.id === this.currentProject);
            if (!project) return;

            project.notes = project.notes.filter(n => n.id !== noteId);
            this.saveUserData();
            this.updateProjectNotesView();
        }
    }

    // Utility functions
    updateCharCount() {
        const text = document.getElementById('transcriptionText').value;
        const charCount = text.length;
        const charCountElement = document.getElementById('charCount');
        const charLimitElement = document.getElementById('charLimit');
        
        charCountElement.textContent = charCount;
        
        if (charCount > CONFIG.MAX_CHARACTERS) {
            charCountElement.style.color = '#e53e3e';
            charLimitElement.style.display = 'inline';
        } else if (charCount > CONFIG.WARNING_CHARACTERS) {
            charCountElement.style.color = '#ed8936';
            charLimitElement.style.display = 'inline';
        } else {
            charCountElement.style.color = '#718096';
            charLimitElement.style.display = 'none';
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Calendar functionality
    updateCalendarView() {
        this.renderCalendar();
        this.updateCalendarHeader();
    }

    // Flashcards functionality
    updateFlashcardsView() {
        const flashcardsList = document.getElementById('allFlashcardsList');
        flashcardsList.innerHTML = '';

        let allFlashcardSets = [];
        
        // Collect all flashcard sets from all projects
        this.projects.forEach(project => {
            if (project.flashcardSets && project.flashcardSets.length > 0) {
                project.flashcardSets.forEach(flashcardSet => {
                    allFlashcardSets.push({
                        ...flashcardSet,
                        projectName: project.name,
                        projectId: project.id
                    });
                });
            }
        });

        if (allFlashcardSets.length === 0) {
            flashcardsList.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <i class="fas fa-layer-group" style="font-size: 3rem; color: #666; margin-bottom: 1rem;"></i>
                    <h3 style="color: #e0e0e0; margin-bottom: 0.5rem;">No flashcard sets yet</h3>
                    <p style="color: #a0a0a0;">Generate flashcards from your notes to get started</p>
                </div>
            `;
            return;
        }

        allFlashcardSets.forEach(flashcardSet => {
            const flashcardCard = document.createElement('div');
            flashcardCard.className = 'flashcard-set-card fade-in';
            flashcardCard.innerHTML = `
                <div class="flashcard-set-card-header">
                    <h4 class="flashcard-set-card-title">${this.escapeHtml(flashcardSet.title)}</h4>
                    <span class="flashcard-count">${flashcardSet.flashcards.length} cards</span>
                </div>
                <div class="flashcard-set-card-meta">
                    <strong>Project:</strong> ${this.escapeHtml(flashcardSet.projectName)}<br>
                    Created: ${new Date(flashcardSet.createdAt).toLocaleString()}
                </div>
                <div class="flashcard-set-card-actions">
                    <button class="btn btn-primary btn-sm" onclick="app.showFlashcardStudyFromAll('${flashcardSet.id}', '${flashcardSet.projectId}')">
                        <i class="fas fa-play"></i> Study
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="app.deleteFlashcardSetFromAll('${flashcardSet.id}', '${flashcardSet.projectId}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            flashcardsList.appendChild(flashcardCard);
        });
    }

    updateCalendarHeader() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const monthYear = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        document.getElementById('currentMonthYear').textContent = monthYear;
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        calendarGrid.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Get first day of month and number of days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDay = firstDay.getDay();

        // Add empty cells for days before month starts
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            const today = new Date();
            
            if (this.isSameDate(currentDate, today)) {
                dayElement.classList.add('today');
            }

            // Check if this day has notes
            const notesForDay = this.getNotesForDate(currentDate);
            if (notesForDay.length > 0) {
                dayElement.classList.add('has-notes');
            }

            dayElement.innerHTML = `
                <div class="day-number">${day}</div>
                ${notesForDay.length > 0 ? `<div class="day-notes-count">${notesForDay.length} note${notesForDay.length !== 1 ? 's' : ''}</div>` : ''}
            `;

            dayElement.addEventListener('click', () => this.selectDate(currentDate));
            calendarGrid.appendChild(dayElement);
        }
    }

    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    getNotesForDate(date) {
        const dateString = date.toISOString().split('T')[0];
        const allNotes = [];
        
        this.projects.forEach(project => {
            project.notes.forEach(note => {
                if (note.assignedDate === dateString) {
                    allNotes.push({
                        ...note,
                        projectName: project.name,
                        projectId: project.id
                    });
                }
            });
        });
        
        return allNotes;
    }

    selectDate(date) {
        this.selectedDate = date;
        const notesForDay = this.getNotesForDate(date);
        
        document.getElementById('selectedDate').textContent = date.toLocaleDateString();
        this.displayNotesForDate(notesForDay);
        document.getElementById('calendarNoteModal').classList.add('active');
    }

    displayNotesForDate(notes) {
        const notesList = document.getElementById('calendarNotesList');
        notesList.innerHTML = '';

        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt" style="font-size: 2rem; color: #666; margin-bottom: 1rem;"></i>
                    <p style="color: #a0a0a0;">No notes for this date</p>
                </div>
            `;
            return;
        }

        notes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = 'calendar-note-item';
            noteItem.innerHTML = `
                <h4>${this.escapeHtml(note.title)}</h4>
                <p><strong>Project:</strong> ${this.escapeHtml(note.projectName)}</p>
                <p><strong>Time:</strong> ${note.assignedTime || 'No time specified'}</p>
                <p>${this.escapeHtml(note.content.substring(0, 100))}${note.content.length > 100 ? '...' : ''}</p>
                <div class="note-actions" style="margin-top: 0.5rem;">
                    <button class="btn btn-outline btn-sm" onclick="app.editNoteFromCalendar('${note.id}', '${note.projectId}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="app.deleteNoteFromCalendar('${note.id}', '${note.projectId}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            notesList.appendChild(noteItem);
        });
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.updateCalendarView();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.updateCalendarView();
    }

    goToToday() {
        this.currentDate = new Date();
        this.updateCalendarView();
    }

    createNoteForDate() {
        this.hideCalendarNoteModal();
        this.showView('noteGeneration');
        // Set the selected date in the date input when saving
        this.pendingDate = this.selectedDate;
    }

    hideCalendarNoteModal() {
        document.getElementById('calendarNoteModal').classList.remove('active');
    }

    editNoteFromCalendar(noteId, projectId) {
        // Switch to project view and highlight the note
        this.currentProject = projectId;
        this.showProjectNotes(this.projects.find(p => p.id === projectId));
        this.hideCalendarNoteModal();
    }

    deleteNoteFromCalendar(noteId, projectId) {
        if (confirm('Are you sure you want to delete this note?')) {
            const project = this.projects.find(p => p.id === projectId);
            if (project) {
                project.notes = project.notes.filter(n => n.id !== noteId);
                this.saveUserData();
                this.displayNotesForDate(this.getNotesForDate(this.selectedDate));
                this.renderCalendar(); // Refresh calendar to update indicators
            }
        }
    }

    // Flashcard functionality
    generateFlashcards(noteId) {
        // Check if user is logged in
        if (!this.isAuthenticated) {
            this.showNotification('Please log in to generate flashcards', 'error');
            this.showLoginModal();
            return;
        }
        
        // Find the note
        let note = null;
        let project = null;
        
        for (const proj of this.projects) {
            const foundNote = proj.notes.find(n => n.id === noteId);
            if (foundNote) {
                note = foundNote;
                project = proj;
                break;
            }
        }
        
        if (!note) {
            this.showNotification('Note not found', 'error');
            return;
        }
        
        this.currentNote = note;
        this.currentProject = project.id;
        
        // Show flashcard generation modal
        document.getElementById('flashcardNoteTitle').textContent = note.title;
        document.getElementById('flashcardModal').classList.add('active');
    }

    hideFlashcardModal() {
        document.getElementById('flashcardModal').classList.remove('active');
    }

    async confirmFlashcardGeneration() {
        if (!this.currentNote) {
            alert('No note selected');
            return;
        }

        this.showLoading(true);
        this.hideFlashcardModal();

        try {
            const flashcards = await this.generateFlashcardsWithAI(this.currentNote.content);
            this.saveFlashcardSet(flashcards);
            alert(`Generated ${flashcards.length} flashcards successfully!`);
        } catch (error) {
            console.error('Error generating flashcards:', error);
            alert('Error generating flashcards. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async generateFlashcardsWithAI(noteContent) {
        // Check if user has a valid API key
        if (!CONFIG || !CONFIG.hasValidApiKey()) {
            throw new Error('API key not configured. Please log in and set your Gemini API key in the API Key settings.');
        }
        
        const apiKey = CONFIG.GEMINI_API_KEY;
        const apiUrl = `${CONFIG.API_URL}?key=${apiKey}`;

        const prompt = `You are an expert educational content creator specializing in flashcard generation. 

Analyze the following study note content and create flashcards with clear terms and definitions. 

Requirements:
- Extract key terms, concepts, or important facts from the content use mainly the main arguments and point and also key concepts
- Create flashcards with clear front (term/question) and back (definition/answer)
- Keep definitions concise but comprehensive (2-3 sentences max)
- Focus on the most important information for studying
- Use proper academic terminology
- Make sure all flashcards are relevant to the same topic
- Include any clubs, empires, or groups that are mentioned
- In conclusion extract anything that might be important or featured on a quiz/test

IMPORTANT: You must respond with ONLY a valid JSON array. Do not include any explanatory text before or after the JSON.

Format the output as a JSON array where each flashcard has this structure:
[
  {
    "term": "The term or question",
    "definition": "The definition or answer"
  },
  {
    "term": "Another term",
    "definition": "Another definition"
  }
]

Study note content:
${noteContent}`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }

        const generatedContent = data.candidates[0].content.parts[0].text;
        
        // Clean the response to extract JSON
        let cleanContent = generatedContent.trim();
        
        // Remove any text before the first [
        const jsonStart = cleanContent.indexOf('[');
        if (jsonStart !== -1) {
            cleanContent = cleanContent.substring(jsonStart);
        }
        
        // Remove any text after the last ]
        const jsonEnd = cleanContent.lastIndexOf(']');
        if (jsonEnd !== -1) {
            cleanContent = cleanContent.substring(0, jsonEnd + 1);
        }
        
        // Parse the JSON response
        try {
            const flashcards = JSON.parse(cleanContent);
            if (Array.isArray(flashcards) && flashcards.length > 0) {
                return flashcards;
            } else {
                throw new Error('Invalid flashcard format');
            }
        } catch (parseError) {
            console.error('JSON parsing failed:', parseError);
            console.error('Raw content:', generatedContent);
            // If JSON parsing fails, try to extract flashcards from text
            return this.extractFlashcardsFromText(generatedContent);
        }
    }

    extractFlashcardsFromText(text) {
        // Fallback method to extract flashcards from text if JSON parsing fails
        const flashcards = [];
        const lines = text.split('\n').filter(line => line.trim());
        
        let currentTerm = '';
        let currentDefinition = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.match(/^\d+\./)) {
                // Save previous flashcard if exists
                if (currentTerm && currentDefinition) {
                    flashcards.push({
                        term: currentTerm,
                        definition: currentDefinition
                    });
                }
                // Start new flashcard
                currentTerm = trimmed.replace(/^\d+\.\s*/, '');
                currentDefinition = '';
            } else if (trimmed && currentTerm) {
                currentDefinition += (currentDefinition ? ' ' : '') + trimmed;
            }
        }
        
        // Add the last flashcard
        if (currentTerm && currentDefinition) {
            flashcards.push({
                term: currentTerm,
                definition: currentDefinition
            });
        }
        
        return flashcards.length > 0 ? flashcards : [
            { term: "Sample Term", definition: "Sample definition from your note" }
        ];
    }

    saveFlashcardSet(flashcards) {
        const project = this.projects.find(p => p.id === this.currentProject);
        if (!project) return;

        const flashcardSetId = Date.now().toString();
        const flashcardSet = {
            id: flashcardSetId,
            title: `${this.currentNote.title} - Flashcards`,
            flashcards: flashcards,
            sourceNoteId: this.currentNote.id,
            createdAt: new Date().toISOString(),
            userId: this.currentUser.id // Associate flashcard set with user
        };

        // Add flashcard set to project
        if (!project.flashcardSets) {
            project.flashcardSets = [];
        }
        project.flashcardSets.push(flashcardSet);
        
        this.saveUserData();
    }

    showFlashcardStudy(flashcardSetId) {
        const project = this.projects.find(p => p.id === this.currentProject);
        if (!project || !project.flashcardSets) return;
        
        const flashcardSet = project.flashcardSets.find(fs => fs.id === flashcardSetId);
        if (!flashcardSet) return;
        
        this.currentFlashcardSet = flashcardSet;
        this.currentFlashcardIndex = 0;
        this.flashcardFlipped = false;
        
        document.getElementById('flashcardStudyTitle').textContent = flashcardSet.title;
        this.renderFlashcard();
        this.updateFlashcardProgress();
        document.getElementById('flashcardStudyModal').classList.add('active');
    }

    hideFlashcardStudyModal() {
        document.getElementById('flashcardStudyModal').classList.remove('active');
        this.currentFlashcardSet = null;
    }

    renderFlashcard() {
        if (!this.currentFlashcardSet || !this.currentFlashcardSet.flashcards) return;
        
        const flashcard = this.currentFlashcardSet.flashcards[this.currentFlashcardIndex];
        const container = document.getElementById('flashcardContainer');
        
        // Clear any existing content completely
        container.innerHTML = '';
        
        // Create fresh flashcard element
        const flashcardElement = document.createElement('div');
        flashcardElement.className = `flashcard ${this.flashcardFlipped ? 'flipped' : ''}`;
        flashcardElement.onclick = () => this.flipFlashcard();
        
        // Create front side
        const frontElement = document.createElement('div');
        frontElement.className = 'flashcard-front';
        frontElement.innerHTML = `
            <div class="flashcard-content">
                <div class="flashcard-term">${this.escapeHtml(flashcard.term)}</div>
            </div>
        `;
        
        // Create back side
        const backElement = document.createElement('div');
        backElement.className = 'flashcard-back';
        backElement.innerHTML = `
            <div class="flashcard-content">
                <div class="flashcard-definition">${this.escapeHtml(flashcard.definition)}</div>
            </div>
        `;
        
        // Append elements
        flashcardElement.appendChild(frontElement);
        flashcardElement.appendChild(backElement);
        container.appendChild(flashcardElement);
        
        // Force a reflow to ensure proper rendering
        container.offsetHeight;
    }

    flipFlashcard() {
        this.flashcardFlipped = !this.flashcardFlipped;
        
        // Update the flashcard class immediately
        const flashcardElement = document.querySelector('.flashcard');
        if (flashcardElement) {
            if (this.flashcardFlipped) {
                flashcardElement.classList.add('flipped');
            } else {
                flashcardElement.classList.remove('flipped');
            }
        }
    }

    previousFlashcard() {
        if (this.currentFlashcardIndex > 0) {
            this.currentFlashcardIndex--;
            this.flashcardFlipped = false;
            this.renderFlashcard();
            this.updateFlashcardProgress();
        }
    }

    nextFlashcard() {
        if (this.currentFlashcardIndex < this.currentFlashcardSet.flashcards.length - 1) {
            this.currentFlashcardIndex++;
            this.flashcardFlipped = false;
            this.renderFlashcard();
            this.updateFlashcardProgress();
        }
    }

    updateFlashcardProgress() {
        if (!this.currentFlashcardSet) return;
        
        const total = this.currentFlashcardSet.flashcards.length;
        const current = this.currentFlashcardIndex + 1;
        const percentage = (current / total) * 100;
        
        document.getElementById('flashcardProgress').textContent = `${current} of ${total}`;
        document.getElementById('flashcardProgressBar').style.width = `${percentage}%`;
        
        // Update button states
        document.getElementById('prevFlashcardBtn').disabled = this.currentFlashcardIndex === 0;
        document.getElementById('nextFlashcardBtn').disabled = this.currentFlashcardIndex === total - 1;
    }

    deleteFlashcardSet(flashcardSetId) {
        if (confirm('Are you sure you want to delete this flashcard set?')) {
            const project = this.projects.find(p => p.id === this.currentProject);
            if (project && project.flashcardSets) {
                project.flashcardSets = project.flashcardSets.filter(fs => fs.id !== flashcardSetId);
                this.saveUserData();
                this.updateProjectNotesView();
            }
        }
    }

    showFlashcardStudyFromAll(flashcardSetId, projectId) {
        this.currentProject = projectId;
        this.showFlashcardStudy(flashcardSetId);
    }

    deleteFlashcardSetFromAll(flashcardSetId, projectId) {
        if (confirm('Are you sure you want to delete this flashcard set?')) {
            const project = this.projects.find(p => p.id === projectId);
            if (project && project.flashcardSets) {
                project.flashcardSets = project.flashcardSets.filter(fs => fs.id !== flashcardSetId);
                this.saveUserData();
                this.updateFlashcardsView();
            }
        }
    }

    // Data persistence
    saveProjects() {
        // This method is kept for backward compatibility
        // The actual saving is now handled by saveUserData()
        this.saveUserData();
    }

    loadProjects() {
        // If authenticated, projects are loaded from cloud in loadUserData()
        // If not authenticated, load from localStorage
        if (!this.isAuthenticated) {
            const saved = localStorage.getItem('studyNotesProjects');
            return saved ? JSON.parse(saved) : [];
        }
        return this.projects || [];
    }

    // Note editing functionality
    editNote(noteId) {
        const project = this.projects.find(p => p.id === this.currentProject);
        if (!project) return;

        const note = project.notes.find(n => n.id === noteId);
        if (!note) return;

        this.currentEditingNote = note;
        
        document.getElementById('editNoteTitle').value = note.title;
        document.getElementById('editNoteContent').value = note.content;
        document.getElementById('noteEditModal').classList.add('active');
    }

    hideNoteEditModal() {
        document.getElementById('noteEditModal').classList.remove('active');
        this.currentEditingNote = null;
    }

    saveNoteEdit() {
        if (!this.currentEditingNote) return;

        const newTitle = document.getElementById('editNoteTitle').value.trim();
        const newContent = document.getElementById('editNoteContent').value.trim();

        if (!newTitle || !newContent) {
            alert('Please fill in both title and content');
            return;
        }

        const project = this.projects.find(p => p.id === this.currentProject);
        if (!project) return;

        const note = project.notes.find(n => n.id === this.currentEditingNote.id);
        if (!note) return;

        note.title = newTitle;
        note.content = newContent;
        note.updatedAt = new Date().toISOString();

        this.saveUserData();
        this.updateProjectNotesView();
        this.hideNoteEditModal();
        
        alert('Note updated successfully!');
    }

    viewNote(noteId) {
        const project = this.projects.find(p => p.id === this.currentProject);
        if (!project) return;

        const note = project.notes.find(n => n.id === noteId);
        if (!note) return;

        document.getElementById('noteViewTitle').textContent = note.title;
        document.getElementById('noteViewContent').innerHTML = this.formatNotesForDisplay(note.content);
        document.getElementById('noteViewModal').classList.add('active');
    }

    hideNoteViewModal() {
        document.getElementById('noteViewModal').classList.remove('active');
    }

    // ===== Chat Functionality =====
    showChatView() {
        // Check if user is logged in
        if (!this.isAuthenticated) {
            this.showNotification('Please log in to use the chat feature', 'error');
            this.showLoginModal();
            return;
        }
        
        this.showView('chat');
    }

    updateChatView() {
        this.populateChatNoteSelector();
        this.clearChatHistory();
    }

    populateChatNoteSelector() {
        const select = document.getElementById('chatNoteSelect');
        select.innerHTML = '<option value="">Choose a note...</option>';
        
        // Get all notes from all projects
        const allNotes = [];
        this.projects.forEach(project => {
            project.notes.forEach(note => {
                allNotes.push({
                    id: note.id,
                    title: note.title,
                    projectName: project.name
                });
            });
        });
        
        // Populate dropdown
        allNotes.forEach(note => {
            const option = document.createElement('option');
            option.value = note.id;
            option.textContent = `${note.title} (${note.projectName})`;
            select.appendChild(option);
        });
    }

    selectChatNote(noteId) {
        if (!noteId) {
            this.currentChatNote = null;
            this.clearChatHistory();
            this.disableChatInput();
            return;
        }

        // Find the note
        let selectedNote = null;
        for (const project of this.projects) {
            selectedNote = project.notes.find(note => note.id === noteId);
            if (selectedNote) break;
        }

        if (selectedNote) {
            this.currentChatNote = selectedNote;
            this.clearChatHistory();
            this.enableChatInput();
            this.addWelcomeMessage();
        }
    }

    clearChatHistory() {
        this.chatHistory = [];
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-message">
                    <i class="fas fa-robot"></i>
                    <h3>Welcome to AI Chat!</h3>
                    <p>Select a note from the dropdown above to start chatting with Jarvis about your study material.</p>
                </div>
            </div>
        `;
    }

    addWelcomeMessage() {
        if (!this.currentChatNote) return;
        
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="chat-message assistant">
                <div class="message-bubble assistant">
                    <div class="typing-indicator">
                        <i class="fas fa-robot"></i>
                        <span>Jarvis is ready to help you with "${this.currentChatNote.title}"</span>
                    </div>
                    <div class="message-time">${new Date().toLocaleTimeString()}</div>
                </div>
            </div>
        `;
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    enableChatInput() {
        document.getElementById('chatInput').disabled = false;
        document.getElementById('sendChatBtn').disabled = false;
    }

    disableChatInput() {
        document.getElementById('chatInput').disabled = true;
        document.getElementById('sendChatBtn').disabled = true;
    }

    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message || !this.currentChatNote || this.isTyping) return;
        
        // Clear input
        input.value = '';
        
        // Add user message to chat
        this.addMessageToChat('user', message);
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Send to Gemini API
            const response = await this.sendToGeminiChat(message);
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Add assistant response
            this.addMessageToChat('assistant', response);
            
        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again.');
        }
    }

    addMessageToChat(sender, message) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        const time = new Date().toLocaleTimeString();
        
        messageDiv.innerHTML = `
            <div class="message-bubble ${sender}">
                ${this.formatMessage(message)}
                <div class="message-time">${time}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Add to chat history
        this.chatHistory.push({ sender, message, time });
    }

    formatMessage(message) {
        // Convert markdown-like formatting to HTML
        return message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    showTypingIndicator() {
        this.isTyping = true;
        const messagesContainer = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message assistant';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="message-bubble assistant typing">
                <div class="typing-indicator">
                    <i class="fas fa-robot"></i>
                    <span>Jarvis is typing</span>
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async sendToGeminiChat(userMessage) {
        // Check if user has a valid API key
        if (!CONFIG || !CONFIG.hasValidApiKey()) {
            throw new Error('API key not configured. Please log in and set your Gemini API key in the API Key settings.');
        }

        const apiKey = CONFIG.GEMINI_API_KEY;
        const apiUrl = `${CONFIG.API_URL}?key=${apiKey}`;

        // Build context with note content and chat history
        const context = this.buildChatContext(userMessage);
        
        const requestBody = {
            contents: [{ parts: [{ text: context }] }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid API response');
        }

        return data.candidates[0].content.parts[0].text;
    }

    buildChatContext(userMessage) {
        const noteContent = this.currentChatNote.content;
        const noteTitle = this.currentChatNote.title;
        
        // Build conversation history
        let historyContext = '';
        if (this.chatHistory.length > 0) {
            historyContext = '\n\nPrevious conversation:\n';
            this.chatHistory.slice(-6).forEach(entry => { // Keep last 6 messages for context
                const role = entry.sender === 'user' ? 'User' : 'Assistant';
                historyContext += `${role}: ${entry.message}\n`;
            });
        }
        
        return `You are Jarvis, an AI study assistant helping a student with their notes. You have access to the following study note:

Note Title: "${noteTitle}"

Note Content:
${noteContent}
${historyContext}

Current User Question: ${userMessage}

Please provide a helpful, educational response based on the note content. Be conversational and supportive. If the question is not related to the note content, politely redirect the conversation back to the study material.`;
    }

    // ===== Authentication System =====
    checkAuthentication() {
        // Check localStorage first (remember me)
        let token = localStorage.getItem('authToken');
        let user = localStorage.getItem('currentUser');
        let storageType = 'localStorage';
        
        // If no localStorage data, check sessionStorage (temporary login)
        if (!token || !user) {
            token = sessionStorage.getItem('authToken');
            user = sessionStorage.getItem('currentUser');
            storageType = 'sessionStorage';
        }
        
        if (token && user) {
            try {
                const parsedUser = JSON.parse(user);
                const tokenData = parseToken(token);
                
                // Check if token is still valid (not expired)
                if (tokenData && (Date.now() - tokenData.timestamp) < (7 * 24 * 60 * 60 * 1000)) { // 7 days
                    this.currentUser = parsedUser;
                    this.authToken = token;
                    this.isAuthenticated = true;
                    this.updateAuthUI();
                    this.loadUserData();
                } else {
                    this.clearAuthData();
                    console.log('Auth token expired, clearing stored data');
                }
            } catch (e) {
                console.error('Error parsing stored auth data:', e);
                this.clearAuthData();
            }
        }
    }

    checkAutoLoginStatus() {
        // Check if user was auto-logged in and show appropriate message
        const rememberMe = localStorage.getItem('rememberMe');
        if (this.isAuthenticated && rememberMe === 'true' && this.currentUser) {
            // Small delay to ensure UI is ready
            setTimeout(() => {
                this.showNotification(`Welcome back, ${this.currentUser.name}! You were automatically logged in.`, 'success');
            }, 1000);
        }
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userWelcome = document.getElementById('userWelcome');
        const userName = document.getElementById('userName');
        const apiKeyBtn = document.getElementById('apiKeyBtn');
        
        if (this.isAuthenticated) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            userWelcome.style.display = 'inline-block';
            apiKeyBtn.style.display = 'inline-block';
            userName.textContent = this.currentUser.name;
            
            // Load user's API key if available
            this.loadUserApiKey();
        } else {
            loginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            userWelcome.style.display = 'none';
            apiKeyBtn.style.display = 'none';
            
            // Clear API key when logged out
            CONFIG.clearUserApiKey();
        }
    }

    showLoginModal() {
        document.getElementById('loginModal').classList.add('active');
        document.getElementById('loginForm').reset();
        
        // Restore remember me checkbox state if user previously chose to remember
        const rememberMe = localStorage.getItem('rememberMe');
        if (rememberMe === 'true') {
            document.getElementById('rememberMe').checked = true;
        }
    }

    hideLoginModal() {
        document.getElementById('loginModal').classList.remove('active');
        document.getElementById('loginForm').reset();
    }

    showRegisterModal() {
        document.getElementById('registerModal').classList.add('active');
    }

    hideRegisterModal() {
        document.getElementById('registerModal').classList.remove('active');
        document.getElementById('registerForm').reset();
    }

    showForgotPasswordModal() {
        document.getElementById('forgotPasswordModal').classList.add('active');
    }

    hideForgotPasswordModal() {
        document.getElementById('forgotPasswordModal').classList.remove('active');
        document.getElementById('forgotPasswordForm').reset();
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        try {
            this.showLoading(true, 'Signing in...');
            
            // Check if MockAPI is available
            if (typeof MockAPI === 'undefined') {
                throw new Error('MockAPI is not loaded. Please refresh the page and try again.');
            }
            
            const response = await MockAPI.login({ email, password });
            
            if (response.success) {
                this.currentUser = response.user;
                this.authToken = response.token;
                this.isAuthenticated = true;
                
                // Store auth data based on remember me preference
                if (rememberMe) {
                    // Store in localStorage for persistent login
                    localStorage.setItem('authToken', this.authToken);
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                    localStorage.setItem('rememberMe', 'true');
                    console.log('Login data saved to localStorage (remember me enabled)');
                } else {
                    // Store in sessionStorage for temporary login
                    sessionStorage.setItem('authToken', this.authToken);
                    sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                    localStorage.removeItem('rememberMe');
                    console.log('Login data saved to sessionStorage (temporary login)');
                }
                
                this.updateAuthUI();
                this.hideLoginModal();
                this.loadUserData();
                
                this.showNotification('Welcome back, ' + this.currentUser.name + '!', 'success');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        
        // Validation
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 8) {
            this.showNotification('Password must be at least 8 characters long', 'error');
            return;
        }
        
        if (!agreeTerms) {
            this.showNotification('Please agree to the terms and conditions', 'error');
            return;
        }
        
        try {
            this.showLoading(true, 'Creating account...');
            
            // Check if MockAPI is available
            if (typeof MockAPI === 'undefined') {
                throw new Error('MockAPI is not loaded. Please refresh the page and try again.');
            }
            
            const response = await MockAPI.register({ name, email, password });
            
            if (response.success) {
                this.currentUser = response.user;
                this.authToken = response.token;
                this.isAuthenticated = true;
                
                // Store auth data
                localStorage.setItem('authToken', this.authToken);
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                this.updateAuthUI();
                this.hideRegisterModal();
                this.loadUserData();
                
                this.showNotification('Account created successfully! Welcome, ' + this.currentUser.name + '!', 'success');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = document.getElementById('resetEmail').value;
        
        try {
            this.showLoading(true, 'Sending reset link...');
            
            const response = await MockAPI.forgotPassword(email);
            
            if (response.success) {
                this.hideForgotPasswordModal();
                this.showNotification(response.message, 'success');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    logout() {
        this.clearAuthData();
        this.updateAuthUI();
        this.showNotification('You have been logged out', 'info');
        
        // Clear all data and reset to initial state
        this.projects = [];
        this.updateProjectsList();
        this.updateProjectSelect();
    }

    clearAuthData() {
        this.currentUser = null;
        this.authToken = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberMe');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        
        // Clear API key
        CONFIG.clearUserApiKey();
    }
    
    // API Key Management Methods
    async loadUserApiKey() {
        if (!this.isAuthenticated) return;
        
        try {
            const response = await MockAPI.getUserApiKey(this.currentUser.id);
            if (response.success && response.apiKey) {
                CONFIG.setUserApiKey(response.apiKey);
                console.log('✅ User API key loaded successfully');
            }
        } catch (error) {
            console.log('ℹ️  No API key found for user');
        }
    }
    
    showApiKeyModal() {
        document.getElementById('apiKeyModal').classList.add('active');
        
        // Load current API key if available
        if (CONFIG.hasValidApiKey()) {
            const apiKeyInput = document.getElementById('apiKeyInput');
            apiKeyInput.value = CONFIG.GEMINI_API_KEY;
        }
    }
    
    hideApiKeyModal() {
        document.getElementById('apiKeyModal').classList.remove('active');
        
        // Clear form
        document.getElementById('apiKeyForm').reset();
        document.getElementById('apiKeyStatus').style.display = 'none';
    }
    
    async handleApiKeyForm(e) {
        e.preventDefault();
        
        const apiKey = document.getElementById('apiKeyInput').value.trim();
        
        if (!apiKey) {
            this.showNotification('Please enter your API key', 'error');
            return;
        }
        
        if (apiKey.length < 20) {
            this.showNotification('API key appears to be invalid (too short)', 'error');
            return;
        }
        
        try {
            this.showLoading(true, 'Saving API key...');
            
            // Save API key to user account
            await MockAPI.saveUserApiKey(this.currentUser.id, apiKey);
            
            // Set API key in config
            CONFIG.setUserApiKey(apiKey);
            
            // Show success message
            document.getElementById('apiKeyStatus').style.display = 'block';
            
            this.showNotification('API key saved successfully!', 'success');
            
            // Hide modal after a delay
            setTimeout(() => {
                this.hideApiKeyModal();
            }, 2000);
            
        } catch (error) {
            this.showNotification('Failed to save API key: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    toggleApiKeyVisibility() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const toggleBtn = document.getElementById('toggleApiKeyVisibility');
        const icon = toggleBtn.querySelector('i');
        
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            apiKeyInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    async loadUserData() {
        if (!this.isAuthenticated) return;
        
        try {
            this.showLoading(true, 'Loading your data...');
            
            const response = await MockAPI.getUserData(this.currentUser.id);
            
            if (response.success) {
                const userData = response.data;
                
                // Load projects (filter to only user's projects)
                if (userData.projects && userData.projects.length > 0) {
                    this.projects = userData.projects.filter(project => 
                        project.userId === this.currentUser.id
                    );
                }
                
                // Load flashcards (if any)
                if (userData.flashcards && userData.flashcards.length > 0) {
                    // Store flashcards data for later use
                    this.userFlashcards = userData.flashcards;
                }
                
                this.updateProjectsList();
                this.updateProjectSelect();
                
                this.showNotification('Your data has been loaded successfully!', 'success');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showNotification('Error loading your data. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async saveUserData() {
        if (!this.isAuthenticated) {
            // If not authenticated, save to localStorage as before
            this.saveToLocalStorage();
            return;
        }
        
        try {
            // Only save projects that belong to the current user
            const userProjects = this.projects.filter(project => 
                project.userId === this.currentUser.id
            );
            
            const userData = {
                projects: userProjects,
                flashcards: this.userFlashcards || [],
                lastSync: new Date().toISOString()
            };
            
            const response = await MockAPI.saveUserData(this.currentUser.id, userData);
            
            if (response.success) {
                console.log('Data saved to cloud successfully');
            }
        } catch (error) {
            console.error('Error saving user data:', error);
            // Fallback to localStorage
            this.saveToLocalStorage();
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('studyNotesProjects', JSON.stringify(this.projects));
        console.log('Data saved to localStorage');
    }

    showLoading(show, text = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (loadingText) {
            loadingText.textContent = text;
        }
        
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles if not already added
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 10001;
                    animation: slideInRight 0.3s ease-out;
                    max-width: 400px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                }
                .notification-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
                .notification-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
                .notification-info { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if all required dependencies are loaded
    if (typeof CONFIG === 'undefined') {
        console.error('❌ CONFIG is not loaded. Make sure config.js is included.');
        alert('Configuration not loaded. Please refresh the page.');
        return;
    }
    
    if (typeof MockAPI === 'undefined') {
        console.error('❌ MockAPI is not loaded. Make sure api-config.js is included.');
        alert('API configuration not loaded. Please refresh the page.');
        return;
    }
    
    console.log('✅ All dependencies loaded successfully');
    console.log('🔧 CONFIG:', CONFIG);
    console.log('🔧 MockAPI:', MockAPI);
    
    window.app = new StudyNotesApp();
});
