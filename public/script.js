// Theme initialization function
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Theme toggle function
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'ice' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Initialize particles.js only on home page
function initializeParticles() {
    if ((window.location.pathname === '/home' || window.location.pathname === '/') && typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: { value: 80, density: { enable: true, value_area: 800 } },
                color: { value: '#8b5cf6' },
                shape: { type: 'circle' },
                opacity: {
                    value: 0.5,
                    random: false,
                    animation: { enable: true, speed: 1, minimumValue: 0.1, sync: false }
                },
                size: {
                    value: 3,
                    random: true,
                    animation: { enable: true, speed: 2, minimumValue: 0.1, sync: false }
                },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: '#8b5cf6',
                    opacity: 0.2,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 1,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out',
                    bounce: false,
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: { enable: true, mode: 'grab' },
                    onclick: { enable: true, mode: 'push' },
                    resize: true
                },
                modes: {
                    grab: { distance: 140, line_linked: { opacity: 0.5 } },
                    push: { particles_nb: 4 }
                }
            },
            retina_detect: true
        });
    }
}

class ChatInterface {
    constructor() {
        // Generate new session ID only if one doesn't exist
        this.sessionId = localStorage.getItem('currentChatId') || this.generateChatId();
        localStorage.setItem('currentChatId', this.sessionId);
        
        this.chatContainer = document.getElementById('chatContainer');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.historyButton = document.getElementById('historyButton');
        this.chatHistorySidebar = document.getElementById('chatHistorySidebar');
        this.mainContent = document.getElementById('mainContent');
        this.newChatButton = document.getElementById('newChatButton');
        this.chatHistoryList = document.getElementById('chatHistoryList');
        this.isProcessing = false;
        this.historyHoverTimeout = null;
        this.isHistoryVisible = false;
        this.codeBlockHandler = new CodeBlockHandler();
        
        if (!this.chatContainer || !this.userInput || !this.sendButton) {
            console.error('Required chat elements not found');
            return;
        }

        // Clear any existing content
        while (this.chatContainer.firstChild) {
            this.chatContainer.removeChild(this.chatContainer.firstChild);
        }

        this.initializeEventListeners();
        this.typingIndicator = null;
        this.loadChatHistory();
        this.updateChatHistorySidebar();
        this.initializeHistoryHover();
    }

    generateChatId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    initializeEventListeners() {
        // Send button click
        this.sendButton.onclick = (e) => {
            e.preventDefault();
            this.sendMessage();
        };

        // Enter key press
        this.userInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        };

        // History button click
        this.historyButton.onclick = () => {
            this.toggleChatHistory();
        };

        // New chat button click
        this.newChatButton.onclick = () => {
            this.createNewChat();
        };

        // Auto-resize textarea
        this.userInput.addEventListener('input', () => {
            this.userInput.style.height = 'auto';
            this.userInput.style.height = (this.userInput.scrollHeight) + 'px';
        });
    }

    initializeHistoryHover() {
        let hoverZone = 25; // pixels from right edge
        let isHovering = false;

        // Function to show sidebar
        const showSidebar = () => {
            if (!this.isHistoryVisible) {
                this.chatHistorySidebar.style.visibility = 'visible';
                this.chatHistorySidebar.classList.add('active');
                this.mainContent.classList.add('sidebar-active');
                this.isHistoryVisible = true;
            }
        };

        // Function to hide sidebar
        const hideSidebar = () => {
            if (this.isHistoryVisible) {
                this.chatHistorySidebar.classList.remove('active');
                this.mainContent.classList.remove('sidebar-active');
                setTimeout(() => {
                    if (!this.chatHistorySidebar.classList.contains('active')) {
                        this.chatHistorySidebar.style.visibility = 'hidden';
                        this.isHistoryVisible = false;
                    }
                }, 300);
            }
        };

        // Mouse move handler
        document.addEventListener('mousemove', (e) => {
            const isInHoverZone = e.clientX >= window.innerWidth - hoverZone;
            
            if (isInHoverZone && !isHovering) {
                isHovering = true;
                if (this.historyHoverTimeout) clearTimeout(this.historyHoverTimeout);
                this.historyHoverTimeout = setTimeout(showSidebar, 200);
            } else if (!isInHoverZone && !this.chatHistorySidebar.matches(':hover')) {
                isHovering = false;
                if (this.historyHoverTimeout) {
                    clearTimeout(this.historyHoverTimeout);
                    this.historyHoverTimeout = null;
                }
                hideSidebar();
            }
        });

        // Keep sidebar open when mouse is over it
        this.chatHistorySidebar.addEventListener('mouseenter', () => {
            if (this.historyHoverTimeout) {
                clearTimeout(this.historyHoverTimeout);
                this.historyHoverTimeout = null;
            }
            showSidebar();
        });

        // Hide sidebar when mouse leaves it
        this.chatHistorySidebar.addEventListener('mouseleave', (e) => {
            const isInHoverZone = e.clientX >= window.innerWidth - hoverZone;
            if (!isInHoverZone) {
                hideSidebar();
            }
        });
    }

    toggleChatHistory() {
        const isActive = this.chatHistorySidebar.classList.contains('active');
        
        if (isActive) {
            // Hide sidebar
            this.chatHistorySidebar.classList.remove('active');
            this.mainContent.classList.remove('sidebar-active');
            
            // Reset visibility and opacity after transition
            setTimeout(() => {
                this.chatHistorySidebar.style.visibility = 'hidden';
            }, 300); // Match the transition duration
        } else {
            // Show sidebar
            this.chatHistorySidebar.style.visibility = 'visible';
            this.chatHistorySidebar.classList.add('active');
            this.mainContent.classList.add('sidebar-active');
        }
    }

    createNewChat() {
        // Save current chat if it exists
        this.saveChatToHistory();

        // Create new chat session
        this.sessionId = this.generateChatId();
        localStorage.setItem('currentChatId', this.sessionId);

        // Clear chat container
        while (this.chatContainer.firstChild) {
            this.chatContainer.removeChild(this.chatContainer.firstChild);
        }

        // Show welcome UI
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            <h1>Welcome to CordAI</h1>
            <p>How can I assist you today?</p>
        `;
        this.chatContainer.appendChild(welcomeDiv);

        // Initialize chat history for new session
        const welcomeMessage = {
            role: 'ai',
            content: "Hello! I'm CordAI, your advanced AI assistant. How can I help you today?"
        };
        
        localStorage.setItem(`chat_${this.sessionId}_messages`, JSON.stringify([welcomeMessage]));
        
        // Update chat history
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        const newChat = {
            id: this.sessionId,
            title: 'New Chat',
            timestamp: Date.now(),
            messages: [welcomeMessage]
        };

        chatHistory.unshift(newChat);
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        this.updateChatHistorySidebar();
    }

    saveChatToHistory() {
        const messages = JSON.parse(localStorage.getItem(`chat_${this.sessionId}_messages`) || '[]');
        if (messages.length > 0) {
            const firstUserMessage = messages.find(msg => msg.role === 'user');
            const title = firstUserMessage ? 
                firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '') : 
                'New Chat';
            
            const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
            const existingIndex = chatHistory.findIndex(chat => chat.id === this.sessionId);
            
            const chatInfo = {
                id: this.sessionId,
                title: title,
                timestamp: existingIndex !== -1 ? 
                    chatHistory[existingIndex].timestamp : 
                    messages.find(msg => msg.role === 'user')?.timestamp || Date.now(),
                messages: messages
            };

            if (existingIndex !== -1) {
                chatHistory[existingIndex] = {
                    ...chatHistory[existingIndex],
                    title: chatInfo.title,
                    messages: chatInfo.messages
                };
            } else {
                chatHistory.push(chatInfo);
            }

            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        }
    }

    loadChat(chatId) {
        // Save current chat before loading new one
        this.saveChatToHistory();
        
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        const chat = chatHistory.find(c => c.id === chatId);
        
        if (chat) {
            // Update session ID without modifying timestamp
            this.sessionId = chatId;
            localStorage.setItem('currentChatId', chatId);
            
            // Clear current chat
            while (this.chatContainer.firstChild) {
                this.chatContainer.removeChild(this.chatContainer.firstChild);
            }
            
            // Load messages
            chat.messages.forEach(msg => {
                this.addMessageToChat(msg.role, msg.content);
            });
            
            // Update sidebar without changing order
            this.updateChatHistorySidebar();
            
            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                this.toggleChatHistory();
            }
        }
    }

    deleteChat(chatId, event) {
        event.stopPropagation();
        
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        
        if (chatHistory.length <= 1) {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = 'Cannot delete the last chat';
            notification.style.cssText = `
                position: fixed;
                top: 60px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--bg-tertiary);
                color: var(--text-primary);
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                border: 1px solid var(--border-light);
                z-index: 1002;
                animation: fadeIn 0.3s ease-out;
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
            
            return;
        }
        
        localStorage.removeItem(`chat_${chatId}_messages`);
        
        const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
        localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
        
        if (chatId === this.sessionId) {
            const nextChat = updatedHistory[0];
            if (nextChat) {
                this.loadChat(nextChat.id);
            }
        }
        
        this.updateChatHistorySidebar();
    }

    updateChatHistorySidebar() {
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        this.chatHistoryList.innerHTML = '';

        if (chatHistory.length === 0) {
            this.chatHistoryList.innerHTML = '<div class="chat-date-group"><div class="chat-date-label">No chat history</div></div>';
            return;
        }

        const groupedChats = this.groupChatsByDate(chatHistory);

        for (const [date, chats] of Object.entries(groupedChats)) {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'chat-date-group';
            
            const dateLabel = document.createElement('div');
            dateLabel.className = 'chat-date-label';
            dateLabel.textContent = date;
            dateGroup.appendChild(dateLabel);

            chats.forEach(chat => {
                const chatItem = this.createChatHistoryItem(chat);
                dateGroup.appendChild(chatItem);
            });

            this.chatHistoryList.appendChild(dateGroup);
        }
    }

    groupChatsByDate(chats) {
        const grouped = {};
        
        chats.sort((a, b) => b.timestamp - a.timestamp);
        
        chats.forEach(chat => {
            const date = new Date(chat.timestamp);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let dateStr;
            if (date.toDateString() === today.toDateString()) {
                dateStr = 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateStr = 'Yesterday';
            } else {
                dateStr = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                });
            }

            if (!grouped[dateStr]) {
                grouped[dateStr] = [];
            }
            grouped[dateStr].push(chat);
        });

        return grouped;
    }

    createChatHistoryItem(chat) {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item${chat.id === this.sessionId ? ' active' : ''}`;
        chatItem.onclick = () => this.loadChat(chat.id);

        const content = document.createElement('div');
        content.className = 'chat-item-content';

        const title = document.createElement('div');
        title.className = 'chat-item-title';
        title.textContent = chat.title;

        const time = document.createElement('div');
        time.className = 'chat-item-time';
        time.textContent = new Date(chat.timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });

        content.appendChild(title);
        content.appendChild(time);

        const actions = document.createElement('div');
        actions.className = 'chat-item-actions';

        const deleteButton = document.createElement('button');
        deleteButton.className = 'chat-item-button';
        deleteButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
        `;
        deleteButton.onclick = (e) => this.deleteChat(chat.id, e);

        actions.appendChild(deleteButton);
        chatItem.appendChild(content);
        chatItem.appendChild(actions);

        return chatItem;
    }

    loadChatHistory() {
        const messages = JSON.parse(localStorage.getItem(`chat_${this.sessionId}_messages`) || '[]');
        
        // Clear any existing content
        while (this.chatContainer.firstChild) {
            this.chatContainer.removeChild(this.chatContainer.firstChild);
        }
        
        if (messages.length === 0) {
            // Show welcome UI for new chat
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'welcome-message';
            welcomeDiv.innerHTML = `
                <h1>Welcome to CordAI</h1>
                <p>How can I assist you today?</p>
            `;
            this.chatContainer.appendChild(welcomeDiv);
            
            // Initialize with welcome message
            const welcomeMessage = {
                role: 'ai',
                content: "Hello! I'm CordAI, your advanced AI assistant. How can I help you today?"
            };
            localStorage.setItem(`chat_${this.sessionId}_messages`, JSON.stringify([welcomeMessage]));
        } else {
            // Load existing messages
            messages.forEach(msg => {
                this.addMessageToChat(msg.role, msg.content);
            });
        }
    }

    async sendMessage() {
        if (this.isProcessing || !this.userInput || !this.userInput.value.trim()) {
            return;
        }
        
        const message = this.userInput.value.trim();
        this.userInput.value = '';
        this.userInput.style.height = 'auto';
        this.isProcessing = true;
        
        const currentTime = Date.now();
        
        this.addMessageToChat('user', message);
        const messages = JSON.parse(localStorage.getItem(`chat_${this.sessionId}_messages`) || '[]');
        messages.push({ 
            role: 'user', 
            content: message,
            timestamp: currentTime
        });
        
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        const existingIndex = chatHistory.findIndex(chat => chat.id === this.sessionId);
        
        if (existingIndex !== -1) {
            chatHistory[existingIndex].timestamp = currentTime;
            chatHistory[existingIndex].lastInteraction = currentTime;
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        }

        this.showTypingIndicator();
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: this.sessionId
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            this.hideTypingIndicator();
            if (data.response) {
                this.addMessageToChat('ai', data.response);
                messages.push({ 
                    role: 'ai', 
                    content: data.response,
                    timestamp: currentTime
                });
                
                localStorage.setItem(`chat_${this.sessionId}_messages`, JSON.stringify(messages));
                this.updateChatHistorySidebar();
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addMessageToChat('ai', 'Sorry, I encountered an error. Please try again.');
        } finally {
            this.isProcessing = false;
            if (this.userInput) {
                this.userInput.focus();
            }
        }
    }

    addMessageToChat(role, content) {
        if (!this.chatContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        if (role === 'ai') {
            // Format the content before adding it
            const formattedContent = this.formatAIMessage(content);
            messageDiv.innerHTML = formattedContent;
            
            // Let the CodeBlockHandler process any code blocks
            this.codeBlockHandler.processMessage(messageDiv);
        } else {
            // For user messages, just set the content directly
            messageDiv.textContent = content;
        }
        
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    formatAIMessage(content) {
        let formatted = content
            // Preserve line breaks
            .replace(/\n/g, '<br>')
            // Preserve multiple spaces
            .replace(/  /g, '&nbsp;&nbsp;')
            // Format bullet points
            .replace(/^•\s+(.+)$/gm, '<div class="bullet-point">•&nbsp;$1</div>')
            // Format numbered lists
            .replace(/^\d+\.\s+(.+)$/gm, '<div class="list-item">$&</div>')
            // Format sections (lines ending with ':')
            .replace(/^(.+):$/gm, '<div class="section-header">$1:</div>')
            // Add spacing after sections
            .replace(/<\/div><br>/g, '</div><div class="section-spacing"></div>');

        return formatted;
    }

    showTypingIndicator() {
        if (this.typingIndicator || !this.chatContainer) return;
        
        this.typingIndicator = document.createElement('div');
        this.typingIndicator.className = 'typing-indicator';
        this.typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        this.chatContainer.appendChild(this.typingIndicator);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    hideTypingIndicator() {
        if (!this.typingIndicator) return;
        
        this.typingIndicator.remove();
        this.typingIndicator = null;
    }
}

// Disable auth button click events
document.addEventListener('DOMContentLoaded', () => {
    const authButton = document.getElementById('authButton');
    if (authButton) {
        authButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Do nothing - Coming Soon
        });
    }

    // Initialize theme
    initializeTheme();
    
    // Initialize particles only on home page
    if (window.location.pathname === '/home' || window.location.pathname === '/') {
        initializeParticles();
    }
    
    // Initialize appropriate interface based on path
    if (window.location.pathname === '/cordai' || window.location.pathname === '/cordai/') {
        new ChatInterface();
    } else if (window.location.pathname === '/cordchain' || window.location.pathname === '/cordchain/') {
        new ChainInterface();
    }

    // Theme toggle listener
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.onclick = toggleTheme;
    }
});