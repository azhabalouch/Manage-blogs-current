// Blog Content Manager - Phase 1: Core CRUD & GitHub Sync

class BlogManager {
    constructor() {
        this.blogs = [];
        this.editingId = null;
        this.currentView = 'monthly';
        this.currentDate = new Date();
        this.currentTab = 'all';
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.loadBlogs();
        this.loadExistingFiles();
        this.setupEventListeners();
        this.renderBlogs();
        this.renderCalendar();
    }

    // Load blogs from localStorage
    loadBlogs() {
        const savedBlogs = localStorage.getItem('blogs');
        if (savedBlogs) {
            this.blogs = JSON.parse(savedBlogs);
        } else {
            // Try to recover from backup if main data is missing
            const backup = localStorage.getItem('blogs_backup');
            if (backup) {
                this.blogs = JSON.parse(backup);
                this.saveBlogs(); // Restore from backup
                console.log('Restored from backup');
            }
        }
    }

    // Load existing blogs from blogs.json only
    async loadExistingFiles() {
        if (this.blogs.length === 0) {
            // Load from blogs.json
            try {
                const jsonResponse = await fetch('blogs.json');
                if (jsonResponse.ok) {
                    const jsonData = await jsonResponse.json();
                    if (jsonData.blogs && Array.isArray(jsonData.blogs)) {
                        this.blogs = jsonData.blogs;
                        this.saveBlogs();
                        this.renderBlogs();
                        console.log('Loaded from blogs.json');
                    }
                } else {
                    console.log('blogs.json not found - starting with empty blog list');
                }
            } catch (error) {
                console.log('No blogs.json found - starting fresh');
            }
        } else {
            // If we have blogs in localStorage, sync completion status from blogs.json
            await this.syncCompletionFromJson();
        }
    }

    // Sync completion status from blogs.json to current blogs
    async syncCompletionFromJson() {
        try {
            const jsonResponse = await fetch('blogs.json');
            if (jsonResponse.ok) {
                const jsonData = await jsonResponse.json();
                if (jsonData.blogs && Array.isArray(jsonData.blogs)) {
                    // Match by title and update completion status
                    jsonData.blogs.forEach(jsonBlog => {
                        const localBlog = this.blogs.find(b => 
                            b.title.toLowerCase().trim() === jsonBlog.title.toLowerCase().trim()
                        );
                        if (localBlog && localBlog.completed !== jsonBlog.completed) {
                            localBlog.completed = jsonBlog.completed;
                        }
                    });
                    this.saveBlogs();
                    console.log('Synced completion status from blogs.json');
                }
            }
        } catch (error) {
            console.log('Could not sync from blogs.json');
        }
    }

    // Extract clean title from filename
    extractTitleFromFilename(filename) {
        return filename
            .replace(/\.(docx|md|txt)$/i, '')
            .replace(/HUMANISED|FINALISED|HUMANIZED/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Save blogs to localStorage
    saveBlogs() {
        localStorage.setItem('blogs', JSON.stringify(this.blogs));
    }

    // Setup event listeners
    setupEventListeners() {
        // Add blog
        document.getElementById('addBlogBtn').addEventListener('click', () => this.addBlog());
        document.getElementById('blogTitleInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addBlog();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentTab = e.currentTarget.dataset.tab;
                this.renderBlogs();
            });
        });

        // Search functionality
        const searchInput = document.getElementById('blogSearch');
        const clearSearchBtn = document.getElementById('clearSearch');
        
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase().trim();
            clearSearchBtn.style.display = this.searchQuery ? 'flex' : 'none';
            this.renderBlogs();
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            clearSearchBtn.style.display = 'none';
            this.renderBlogs();
        });

        // Bulk upload - Drag & Drop
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentTab = e.currentTarget.dataset.tab;
                this.renderBlogs();
            });
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.querySelector('.close').addEventListener('click', () => this.closeSettings());
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());

        // Import from blogs.json
        document.getElementById('importJsonBtn').addEventListener('click', () => this.importFromJson());

        // Sync to GitHub
        document.getElementById('syncBtn').addEventListener('click', () => this.syncToGitHub());

        // Calendar controls
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderCalendar();
            });
        });

        document.getElementById('prevBtn').addEventListener('click', () => this.navigateCalendar(-1));
        document.getElementById('nextBtn').addEventListener('click', () => this.navigateCalendar(1));
        document.getElementById('todayBtn').addEventListener('click', () => {
            this.currentDate = new Date();
            this.renderCalendar();
        });

        document.getElementById('autoScheduleBtn').addEventListener('click', () => this.autoSchedule30());

        // Close modal on outside click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettings();
            }
        });
    }

    // Handle bulk file upload
    handleFiles(files) {
        if (!files || files.length === 0) return;

        let addedCount = 0;
        Array.from(files).forEach(file => {
            const title = this.extractTitleFromFilename(file.name);
            
            // Check for duplicates
            const exists = this.blogs.some(b => b.title.toLowerCase() === title.toLowerCase());
            if (!exists && title) {
                const blog = {
                    id: Date.now() + this.blogs.length + addedCount,
                    title: title,
                    completed: false,
                    createdAt: new Date().toISOString()
                };
                this.blogs.unshift(blog);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            this.saveBlogs();
            this.renderBlogs();
            this.showToast(`${addedCount} blog(s) added successfully!`, 'success');
        } else {
            this.showToast('No new blogs to add', 'error');
        }

        // Reset file input
        document.getElementById('fileInput').value = '';
    }

    // Add new blog
    addBlog() {
        const input = document.getElementById('blogTitleInput');
        const title = input.value.trim();

        if (!title) {
            this.showToast('Please enter a blog title', 'error');
            return;
        }

        const blog = {
            id: Date.now() + this.blogs.length,
            title: title,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.blogs.unshift(blog);
        this.saveBlogs();
        this.renderBlogs();
        
        input.value = '';
        this.showToast('Blog added successfully!', 'success');
    }

    // Edit blog
    editBlog(id) {
        this.editingId = id;
        this.renderBlogs();
    }

    // Save edited blog
    saveEdit(id) {
        const input = document.getElementById(`edit-input-${id}`);
        const newTitle = input ? input.value.trim() : '';

        if (!newTitle) {
            this.showToast('Title cannot be empty', 'error');
            return;
        }

        const blog = this.blogs.find(b => b.id === id);
        if (blog) {
            blog.title = newTitle;
            this.saveBlogs();
            this.editingId = null;
            this.renderBlogs();
            this.showToast('Blog updated successfully!', 'success');
        }
    }

    // Cancel edit
    cancelEdit() {
        this.editingId = null;
        this.renderBlogs();
    }

    // Toggle blog completion status
    toggleComplete(id) {
        const blog = this.blogs.find(b => b.id === id);
        if (blog) {
            blog.completed = !blog.completed;
            this.saveBlogs(); // Save immediately
            this.renderBlogs();
            this.renderCalendar(); // Update calendar to reflect completion status
        }
    }

    // Delete blog
    deleteBlog(id) {
        if (confirm('Are you sure you want to delete this blog?')) {
            this.blogs = this.blogs.filter(b => b.id !== id);
            this.saveBlogs();
            this.renderBlogs();
            this.showToast('Blog deleted successfully!', 'success');
        }
    }

    // Render blogs
    renderBlogs() {
        const blogList = document.getElementById('blogList');
        const blogCount = document.getElementById('blogCount');
        
        // Filter blogs based on current tab
        let filteredBlogs = this.blogs;
        if (this.currentTab === 'todo') {
            filteredBlogs = this.blogs.filter(b => !b.completed);
        } else if (this.currentTab === 'uploaded') {
            filteredBlogs = this.blogs.filter(b => b.completed);
        }
        
        // Apply search filter
        if (this.searchQuery) {
            filteredBlogs = filteredBlogs.filter(b => 
                b.title.toLowerCase().includes(this.searchQuery)
            );
        }
        
        // Update counts
        blogCount.textContent = this.blogs.length;
        document.getElementById('allCount').textContent = this.blogs.length;
        document.getElementById('todoCount').textContent = this.blogs.filter(b => !b.completed).length;
        document.getElementById('uploadedCount').textContent = this.blogs.filter(b => b.completed).length;

        if (filteredBlogs.length === 0) {
            let emptyMessage;
            if (this.searchQuery) {
                emptyMessage = `No blogs found matching "${this.searchQuery}"`;
            } else {
                emptyMessage = this.currentTab === 'todo' ? 'No pending blogs. All done! 🎉' : 
                               this.currentTab === 'uploaded' ? 'No uploaded blogs yet.' : 
                               'No blogs yet. Add your first blog to get started!';
            }
            blogList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <p>${emptyMessage}</p>
                </div>
            `;
            return;
        }

        blogList.innerHTML = filteredBlogs.map(blog => {
            if (this.editingId === blog.id) {
                return `
                    <div class="blog-item">
                        <div class="blog-item-content">
                            <input type="checkbox" class="blog-checkbox" ${blog.completed ? 'checked' : ''} onclick="blogManager.toggleComplete(${blog.id})" />
                            <div class="blog-item-text">
                                <input type="text" id="edit-input-${blog.id}" value="${this.escapeHtml(blog.title)}" autofocus />
                            </div>
                        </div>
                        <div class="blog-item-actions">
                            <button class="btn btn-success" onclick="blogManager.saveEdit(${blog.id})">💾 Save</button>
                            <button class="btn btn-secondary" onclick="blogManager.cancelEdit()">❌ Cancel</button>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="blog-item">
                    <div class="blog-item-content">
                        <input type="checkbox" class="blog-checkbox" ${blog.completed ? 'checked' : ''} onclick="blogManager.toggleComplete(${blog.id})" />
                        <div class="blog-item-text">
                            <div class="blog-item-title ${blog.completed ? 'completed' : ''}">${this.escapeHtml(blog.title)}</div>
                        </div>
                    </div>
                    <div class="blog-item-actions">
                        <button class="btn btn-edit" onclick="blogManager.editBlog(${blog.id})">✏️ Edit</button>
                        <button class="btn btn-danger" onclick="blogManager.deleteBlog(${blog.id})">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Open settings modal
    openSettings() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('show');

        // Load saved settings
        const settings = this.getSettings();
        document.getElementById('githubToken').value = settings.token || '';
        document.getElementById('repoName').value = settings.repo || '';
        document.getElementById('branchName').value = settings.branch || 'main';
    }

    // Close settings modal
    closeSettings() {
        const modal = document.getElementById('settingsModal');
        modal.classList.remove('show');
    }

    // Save settings
    saveSettings() {
        const token = document.getElementById('githubToken').value.trim();
        const repo = document.getElementById('repoName').value.trim();
        const branch = document.getElementById('branchName').value.trim();

        if (!token || !repo || !branch) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        const settings = { token, repo, branch };
        localStorage.setItem('githubSettings', JSON.stringify(settings));
        
        this.closeSettings();
        this.showToast('Settings saved successfully!', 'success');
    }

    // Get settings
    getSettings() {
        const settings = localStorage.getItem('githubSettings');
        return settings ? JSON.parse(settings) : {};
    }

    // Sync to GitHub
    async syncToGitHub() {
        const settings = this.getSettings();

        if (!settings.token || !settings.repo || !settings.branch) {
            this.showToast('Please configure GitHub settings first', 'error');
            this.openSettings();
            return;
        }

        const syncBtn = document.getElementById('syncBtn');
        syncBtn.disabled = true;
        syncBtn.textContent = '⏳ Syncing...';

        try {
            // Ensure data is saved locally before syncing
            this.saveBlogs();
            
            // Create backup before sync
            localStorage.setItem('blogs_backup', JSON.stringify(this.blogs));
            
            // Prepare blog data
            const blogData = {
                blogs: this.blogs,
                lastSync: new Date().toISOString(),
                totalBlogs: this.blogs.length
            };

            // GitHub API endpoint
            const [owner, repoName] = settings.repo.split('/');
            
            if (!owner || !repoName) {
                throw new Error('Invalid repository format. Use: owner/repository');
            }
            
            const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/blogs.json`;

            // Check if file exists
            let sha = null;
            try {
                const checkResponse = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `token ${settings.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (checkResponse.ok) {
                    const fileData = await checkResponse.json();
                    sha = fileData.sha;
                } else if (checkResponse.status !== 404) {
                    // If it's not a 404, it might be an auth or permission issue
                    const errorData = await checkResponse.json();
                    throw new Error(errorData.message || 'Failed to access repository');
                }
            } catch (error) {
                if (error.message && !error.message.includes('fetch')) {
                    throw error; // Re-throw if it's not a network error
                }
                console.log('File does not exist yet, will create new');
            }

            // Create or update file
            const content = btoa(JSON.stringify(blogData, null, 2));
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${settings.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Update blogs.json - ${this.blogs.length} blogs`,
                    content: content,
                    branch: settings.branch,
                    ...(sha && { sha })
                })
            });

            if (!response.ok) {
                const error = await response.json();
                let errorMessage = error.message || 'Failed to sync to GitHub';
                
                // Provide helpful error messages
                if (response.status === 404) {
                    errorMessage = 'Repository not found. Check your repository name (format: owner/repo)';
                } else if (response.status === 401) {
                    errorMessage = 'Invalid GitHub token. Please check your Personal Access Token';
                } else if (response.status === 403) {
                    errorMessage = 'Permission denied. Ensure your token has "repo" scope';
                }
                
                throw new Error(errorMessage);
            }

            const result = await response.json();
            this.showToast('Successfully synced to GitHub! ✅', 'success');
            console.log('Synced to GitHub:', result.content.html_url);

        } catch (error) {
            console.error('Sync error:', error);
            this.showToast(`Sync failed: ${error.message}`, 'error');
        } finally {
            syncBtn.disabled = false;
            syncBtn.textContent = '🔄 Sync to GitHub';
        }
    }

    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Import data from blogs.json file
    async importFromJson() {
        try {
            const response = await fetch('blogs.json');
            if (!response.ok) {
                this.showToast('blogs.json not found in directory', 'error');
                return;
            }
            
            const jsonData = await response.json();
            if (jsonData.blogs && Array.isArray(jsonData.blogs)) {
                this.blogs = jsonData.blogs;
                this.saveBlogs();
                this.renderBlogs();
                this.renderCalendar();
                this.showToast(`Successfully imported ${this.blogs.length} blogs from JSON!`, 'success');
            } else {
                this.showToast('Invalid JSON format', 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showToast('Failed to import from blogs.json', 'error');
        }
    }

    // Export data as JSON file for manual backup
    exportData() {
        const dataStr = JSON.stringify(this.blogs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `blog-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showToast('Data exported successfully!', 'success');
    }

    // Import data from JSON file
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedBlogs = JSON.parse(e.target.result);
                if (Array.isArray(importedBlogs)) {
                    this.blogs = importedBlogs;
                    this.saveBlogs();
                    this.renderBlogs();
                    this.renderCalendar();
                    this.showToast('Data imported successfully!', 'success');
                } else {
                    this.showToast('Invalid data format', 'error');
                }
            } catch (error) {
                this.showToast('Failed to import data', 'error');
            }
        };
        reader.readAsText(file);
    }

    // Calendar Methods
    navigateCalendar(direction) {
        if (this.currentView === 'monthly') {
            this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        } else if (this.currentView === 'weekly') {
            this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
        } else if (this.currentView === 'daily') {
            this.currentDate.setDate(this.currentDate.getDate() + direction);
        }
        this.renderCalendar();
    }

    renderCalendar() {
        if (this.currentView === 'monthly') {
            this.renderMonthlyView();
        } else if (this.currentView === 'weekly') {
            this.renderWeeklyView();
        } else if (this.currentView === 'daily') {
            this.renderDailyView();
        }
    }

    renderMonthlyView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        document.getElementById('currentDate').textContent = 
            firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const calendarView = document.getElementById('calendarView');
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        let html = '<div class="calendar-grid monthly">';
        
        // Day headers
        days.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Calendar days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateStr = this.formatDate(currentDate);
            const isToday = currentDate.getTime() === today.getTime();
            const isOtherMonth = currentDate.getMonth() !== month;
            const scheduledBlogs = this.getScheduledBlogs(dateStr);

            let dayClass = 'calendar-day';
            if (isToday) dayClass += ' today';
            if (isOtherMonth) dayClass += ' other-month';
            if (scheduledBlogs.length > 0) dayClass += ' has-blogs';

            html += `
                <div class="${dayClass}" onclick="blogManager.openDayScheduler('${dateStr}')">
                    <div class="day-number">${currentDate.getDate()}</div>
                    <div class="scheduled-blogs">
                        ${scheduledBlogs.slice(0, 3).map(blog => 
                            `<div class="scheduled-blog-item ${blog.completed ? 'completed' : ''}" title="${this.escapeHtml(blog.title)}">
                                ${this.escapeHtml(blog.title.substring(0, 20))}${blog.title.length > 20 ? '...' : ''}
                            </div>`
                        ).join('')}
                        ${scheduledBlogs.length > 3 ? `<div class="scheduled-count">+${scheduledBlogs.length - 3}</div>` : ''}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        calendarView.innerHTML = html;
    }

    renderWeeklyView() {
        const startOfWeek = new Date(this.currentDate);
        startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        document.getElementById('currentDate').textContent = 
            `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        const calendarView = document.getElementById('calendarView');
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let html = '<div class="calendar-grid weekly">';

        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + i);
            const dateStr = this.formatDate(currentDate);
            const isToday = currentDate.getTime() === today.getTime();
            const scheduledBlogs = this.getScheduledBlogs(dateStr);

            html += `<div class="calendar-day-header">${days[i]}<br>${currentDate.getDate()}</div>`;
        }

        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + i);
            const dateStr = this.formatDate(currentDate);
            const isToday = currentDate.getTime() === today.getTime();
            const scheduledBlogs = this.getScheduledBlogs(dateStr);

            let dayClass = 'calendar-day';
            if (isToday) dayClass += ' today';
            if (scheduledBlogs.length > 0) dayClass += ' has-blogs';

            html += `
                <div class="${dayClass}" onclick="blogManager.openDayScheduler('${dateStr}')">
                    <div class="scheduled-blogs">
                        ${scheduledBlogs.map(blog => 
                            `<div class="scheduled-blog-item ${blog.completed ? 'completed' : ''}" title="${this.escapeHtml(blog.title)}">
                                ${this.escapeHtml(blog.title)}
                            </div>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        calendarView.innerHTML = html;
    }

    renderDailyView() {
        const dateStr = this.formatDate(this.currentDate);
        const scheduledBlogs = this.getScheduledBlogs(dateStr);
        const unscheduledBlogs = this.blogs.filter(b => !b.scheduledDate && !b.completed);

        document.getElementById('currentDate').textContent = 
            this.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        const calendarView = document.getElementById('calendarView');
        
        let html = '<div class="daily-view-container">';
        
        html += `
            <div class="daily-date-header">
                <h3>${this.currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                <p>${scheduledBlogs.length} blog(s) scheduled</p>
            </div>
        `;

        if (scheduledBlogs.length > 0) {
            html += '<div class="daily-blogs-list">';
            scheduledBlogs.forEach(blog => {
                html += `
                    <div class="daily-blog-card ${blog.completed ? 'completed' : ''}">
                        <div class="daily-blog-title">${this.escapeHtml(blog.title)}</div>
                        <button class="unschedule-btn" onclick="blogManager.unscheduleBlog(${blog.id})">Remove</button>
                    </div>
                `;
            });
            html += '</div>';
        } else {
            html += '<div class="empty-state"><p>No blogs scheduled for this day</p></div>';
        }

        html += '</div>';
        calendarView.innerHTML = html;
    }

    openDayScheduler(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        this.currentDate = date;
        this.currentView = 'daily';
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-view="daily"]').classList.add('active');
        this.renderCalendar();
    }

    getScheduledBlogs(dateStr) {
        return this.blogs.filter(blog => blog.scheduledDate === dateStr);
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    unscheduleBlog(id) {
        const blog = this.blogs.find(b => b.id === id);
        if (blog) {
            delete blog.scheduledDate;
            this.saveBlogs();
            this.renderCalendar();
            this.showToast('Blog unscheduled', 'success');
        }
    }

    autoSchedule30() {
        const pendingBlogs = this.blogs.filter(b => !b.completed && !b.scheduledDate);
        
        if (pendingBlogs.length === 0) {
            this.showToast('No pending blogs to schedule', 'error');
            return;
        }

        const blogsToSchedule = pendingBlogs.slice(0, 30);
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        blogsToSchedule.forEach((blog, index) => {
            const scheduleDate = new Date(startDate);
            scheduleDate.setDate(startDate.getDate() + index);
            blog.scheduledDate = this.formatDate(scheduleDate);
        });

        this.saveBlogs();
        this.renderCalendar();
        this.showToast(`Successfully scheduled ${blogsToSchedule.length} blog(s) for the next ${blogsToSchedule.length} days!`, 'success');
    }
}

// Initialize the app
const blogManager = new BlogManager();
