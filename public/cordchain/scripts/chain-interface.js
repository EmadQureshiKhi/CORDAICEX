class ChainInterface {
    constructor() {
        // Generate new session ID only if one doesn't exist
        this.sessionId = localStorage.getItem('cordchain_currentChatId') || this.generateChatId();
        localStorage.setItem('cordchain_currentChatId', this.sessionId);
        
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
        this.commandSelected = false;
        
        this.commands = {
            '/analyze': ['BTC', 'ETH', 'SOL', 'etc...'],
            '/search': ['pattern', 'similar', 'traders', 'indicators'],
            '/alert': ['price', 'indicator', 'whale', 'trader'],
            '/tx': ['info', 'send', 'verify', 'gas']
        };

        this.commandDescriptions = {
            '/analyze': {
                'BTC': 'Analyze Bitcoin',
                'ETH': 'Analyze Ethereum',
                'SOL': 'Analyze Solana',
                'etc...': 'Analyze any crypto'
            },
            '/search': {
                'pattern': 'Find specific chart patterns',
                'similar': 'Find similar price action',
                'traders': 'Find traders using strategy',
                'indicators': 'Search by technical indicators'
            },
            '/alert': {
                'price': 'Set price-based alerts',
                'indicator': 'Set indicator-based alerts',
                'whale': 'Track large transactions',
                'trader': 'Follow specific traders'
            },
            '/tx': {
                'info': 'Get transaction details',
                'send': 'Create new transaction',
                'verify': 'Verify transaction status',
                'gas': 'Check current gas prices'
            }
        };
        
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
        this.initializeCommandSuggestions();
    }

    initializeCommandSuggestions() {
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'command-suggestions';
        suggestionsContainer.style.display = 'none';
        this.mainContent.appendChild(suggestionsContainer);
        this.suggestionsContainer = suggestionsContainer;

        this.userInput.addEventListener('input', () => {
            if (!this.commandSelected) {
                this.handleCommandInput(this.userInput.value);
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.suggestionsContainer.contains(e.target)) {
                this.suggestionsContainer.style.display = 'none';
            }
        });

        this.userInput.addEventListener('keydown', (e) => {
            if (this.suggestionsContainer.style.display === 'block') {
                const suggestions = this.suggestionsContainer.querySelectorAll('.command-suggestion');
                const currentIndex = Array.from(suggestions).findIndex(el => el.classList.contains('selected'));

                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        this.navigateSuggestions(suggestions, currentIndex, 1);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.navigateSuggestions(suggestions, currentIndex, -1);
                        break;
                    case 'Tab':
                    case 'Enter':
                        e.preventDefault();
                        const selectedSuggestion = this.suggestionsContainer.querySelector('.command-suggestion.selected');
                        if (selectedSuggestion) {
                            this.selectSuggestion(selectedSuggestion.textContent.trim());
                        }
                        break;
                    case 'Escape':
                        this.suggestionsContainer.style.display = 'none';
                        break;
                }
            }
        });

        // Reset command selection on backspace to root command
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                const currentValue = this.userInput.value;
                const parts = currentValue.split(' ');
                if (parts.length <= 1) {
                    this.commandSelected = false;
                }
            }
        });
    }

    navigateSuggestions(suggestions, currentIndex, direction) {
        suggestions.forEach(s => s.classList.remove('selected'));
        let newIndex = currentIndex + direction;
        
        if (newIndex >= suggestions.length) newIndex = 0;
        if (newIndex < 0) newIndex = suggestions.length - 1;
        
        suggestions[newIndex].classList.add('selected');
        suggestions[newIndex].scrollIntoView({ block: 'nearest' });
    }

    handleCommandInput(input) {
        if (!input.startsWith('/')) {
            this.suggestionsContainer.style.display = 'none';
            return;
        }

        const parts = input.split(' ');
        const command = parts[0];
        const subCommand = parts[1] || '';

        let suggestions = [];
        if (parts.length === 1) {
            suggestions = Object.keys(this.commands).map(cmd => ({
                command: cmd,
                description: this.getCommandDescription(cmd)
            }));
        } else if (this.commands[command] && !this.commandSelected) {
            suggestions = this.commands[command]
                .filter(cmd => cmd.startsWith(subCommand))
                .map(cmd => ({
                    command: `${command} ${cmd}`,
                    description: this.commandDescriptions[command][cmd]
                }));
        }

        if (suggestions.length > 0) {
            this.showSuggestions(suggestions);
        } else {
            this.suggestionsContainer.style.display = 'none';
        }
    }

    getCommandDescription(command) {
        switch (command) {
            case '/analyze': return 'Analyze cryptocurrency data';
            case '/search': return 'Search for patterns and trends';
            case '/alert': return 'Set up custom alerts';
            case '/tx': return 'Blockchain transactions';
            default: return '';
        }
    }

    showSuggestions(suggestions) {
        const rect = this.userInput.getBoundingClientRect();
        this.suggestionsContainer.style.position = 'absolute';
        this.suggestionsContainer.style.left = `${rect.left}px`;
        this.suggestionsContainer.style.top = `${rect.top - 10 - (suggestions.length * 36)}px`;
        this.suggestionsContainer.style.width = `${rect.width}px`;
        this.suggestionsContainer.style.display = 'block';

        this.suggestionsContainer.innerHTML = suggestions
            .map(({ command, description }, index) => `
                <div class="command-suggestion ${index === 0 ? 'selected' : ''}">
                    <span class="command">${command}</span>
                    <span class="description">${description}</span>
                </div>
            `).join('');

        const suggestionElements = this.suggestionsContainer.querySelectorAll('.command-suggestion');
        suggestionElements.forEach(element => {
            element.addEventListener('click', () => {
                const command = element.querySelector('.command').textContent;
                this.selectSuggestion(command);
            });
        });
    }

    selectSuggestion(suggestion) {
        this.userInput.value = suggestion + ' ';
        this.userInput.focus();
        this.suggestionsContainer.style.display = 'none';
        
        // Set commandSelected to true only when a full command (with subcommand) is selected
        const parts = suggestion.split(' ');
        if (parts.length > 1) {
            this.commandSelected = true;
        }
    }

    processCommand(message) {
        const parts = message.split(' ');
        const command = parts[0].toLowerCase();
        
        if (!this.commands[command]) {
            return message;
        }

        const subCommand = parts[1] || '';
        const params = parts.slice(2).join(' ');
        
        return `${command} ${subCommand} ${params}`.trim();
    }

    generateChatId() {
        return 'chain_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    initializeEventListeners() {
        this.sendButton.onclick = (e) => {
            e.preventDefault();
            this.sendMessage();
        };

        this.userInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        };

        this.historyButton.onclick = () => {
            this.toggleChatHistory();
        };

        this.newChatButton.onclick = () => {
            this.createNewChat();
        };

        this.userInput.addEventListener('input', () => {
            this.userInput.style.height = 'auto';
            this.userInput.style.height = (this.userInput.scrollHeight) + 'px';
        });
    }

    initializeHistoryHover() {
        let hoverZone = 25;
        let isHovering = false;

        const showSidebar = () => {
            if (!this.isHistoryVisible) {
                this.chatHistorySidebar.style.visibility = 'visible';
                this.chatHistorySidebar.classList.add('active');
                this.mainContent.classList.add('sidebar-active');
                this.isHistoryVisible = true;
            }
        };

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

        this.chatHistorySidebar.addEventListener('mouseenter', () => {
            if (this.historyHoverTimeout) {
                clearTimeout(this.historyHoverTimeout);
                this.historyHoverTimeout = null;
            }
            showSidebar();
        });

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
            this.chatHistorySidebar.classList.remove('active');
            this.mainContent.classList.remove('sidebar-active');
            
            setTimeout(() => {
                this.chatHistorySidebar.style.visibility = 'hidden';
            }, 300);
        } else {
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
        localStorage.setItem('cordchain_currentChatId', this.sessionId);

        // Clear chat container
        while (this.chatContainer.firstChild) {
            this.chatContainer.removeChild(this.chatContainer.firstChild);
        }

        // Show welcome UI
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            <h1>Welcome to CordChain</h1>
            <p>Your advanced crypto analytics assistant powered by Cord Technologies. Experience institutional-grade blockchain analysis with cutting-edge AI technology.</p>
            <div class="command-examples">
                <div class="command-item">
                    <code>/analyze SOL</code>
                    <span class="description">Analyze Any Currency</span>
                </div>
                <div class="command-item">
                    <code>/search pattern bull-flag</code>
                    <span class="description">Find Patterns</span>
                </div>
                <div class="command-item">
                    <code>/alert price ETH > 2000</code>
                    <span class="description">Set Alerts</span>
                </div>
                <div class="command-item">
                    <code>/tx gas</code>
                    <span class="description">Check Gas Prices</span>
                </div>
            </div>
        `;
        this.chatContainer.appendChild(welcomeDiv);

        // Initialize chat history for new session
        const welcomeMessage = {
            role: 'ai',
            content: "Hello! I'm CordChain, your advanced crypto analytics assistant. How can I help you today?"
        };
        
        localStorage.setItem(`cordchain_chat_${this.sessionId}_messages`, JSON.stringify([welcomeMessage]));
        
        // Update chat history
        const chatHistory = JSON.parse(localStorage.getItem('cordchain_chatHistory') || '[]');
        const newChat = {
            id: this.sessionId,
            title: 'New Chat',
            timestamp: Date.now(),
            messages: [welcomeMessage]
        };

        chatHistory.unshift(newChat);
        localStorage.setItem('cordchain_chatHistory', JSON.stringify(chatHistory));
        this.updateChatHistorySidebar();
    }

    saveChatToHistory() {
        const messages = JSON.parse(localStorage.getItem(`cordchain_chat_${this.sessionId}_messages`) || '[]');
        if (messages.length > 0) {
            const firstUserMessage = messages.find(msg => msg.role === 'user');
            const title = firstUserMessage ? 
                firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '') : 
                'New Chat';
            
            const chatHistory = JSON.parse(localStorage.getItem('cordchain_chatHistory') || '[]');
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

            localStorage.setItem('cordchain_chatHistory', JSON.stringify(chatHistory));
        }
    }

    loadChat(chatId) {
        this.saveChatToHistory();
        
        const chatHistory = JSON.parse(localStorage.getItem('cordchain_chatHistory') || '[]');
        const chat = chatHistory.find(c => c.id === chatId);
        
        if (chat) {
            this.sessionId = chatId;
            localStorage.setItem('cordchain_currentChatId', chatId);
            
            while (this.chatContainer.firstChild) {
                this.chatContainer.removeChild(this.chatContainer.firstChild);
            }
            
            chat.messages.forEach(msg => {
                this.addMessageToChat(msg.role, msg.content);
            });
            
            this.updateChatHistorySidebar();
            
            if (window.innerWidth <= 768) {
                this.toggleChatHistory();
            }
        }
    }

    deleteChat(chatId, event) {
        event.stopPropagation();
        
        const chatHistory = JSON.parse(localStorage.getItem('cordchain_chatHistory') || '[]');
        
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
        
        localStorage.removeItem(`cordchain_chat_${chatId}_messages`);
        
        const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
        localStorage.setItem('cordchain_chatHistory', JSON.stringify(updatedHistory));
        
        if (chatId === this.sessionId) {
            const nextChat = updatedHistory[0];
            if (nextChat) {
                this.loadChat(nextChat.id);
            }
        }
        
        this.updateChatHistorySidebar();
    }

    updateChatHistorySidebar() {
        const chatHistory = JSON.parse(localStorage.getItem('cordchain_chatHistory') || '[]');
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
        const messages = JSON.parse(localStorage.getItem(`cordchain_chat_${this.sessionId}_messages`) || '[]');
        
        // Clear any existing content
        while (this.chatContainer.firstChild) {
            this.chatContainer.removeChild(this.chatContainer.firstChild);
        }
        
        if (messages.length === 0) {
            // Show welcome UI for new chat
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'welcome-message';
            welcomeDiv.innerHTML = `
                <h1>Welcome to CordChain</h1>
                <p>Your advanced crypto analytics assistant powered by Cord Technologies. Experience institutional-grade blockchain analysis with cutting-edge AI technology.</p>
                <div class="command-examples">
                    <div class="command-item">
                        <code>/analyze SOL</code>
                        <span class="description">Analyze Any Currency</span>
                    </div>
                    <div class="command-item">
                        <code>/search pattern bull-flag</code>
                        <span class="description">Find Patterns</span>
                    </div>
                    <div class="command-item">
                        <code>/alert price ETH > 2000</code>
                        <span class="description">Set Alerts</span>
                    </div>
                    <div class="command-item">
                        <code>/tx gas</code>
                        <span class="description">Check Gas Prices</span>
                    </div>
                </div>
            `;
            this.chatContainer.appendChild(welcomeDiv);
            
            // Initialize with welcome message
            const welcomeMessage = {
                role: 'ai',
                content: "Hello! I'm CordChain, your advanced crypto analytics assistant. How can I help you today?"
            };
            localStorage.setItem(`cordchain_chat_${this.sessionId}_messages`, JSON.stringify([welcomeMessage]));
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
        this.commandSelected = false;
        
        const currentTime = Date.now();
        
        this.addMessageToChat('user', message);
        const messages = JSON.parse(localStorage.getItem(`cordchain_chat_${this.sessionId}_messages`) || '[]');
        messages.push({ 
            role: 'user', 
            content: message,
            timestamp: currentTime
        });
        
        const chatHistory = JSON.parse(localStorage.getItem('cordchain_chatHistory') || '[]');
        const existingIndex = chatHistory.findIndex(chat => chat.id === this.sessionId);
        
        if (existingIndex !== -1) {
            chatHistory[existingIndex].timestamp = currentTime;
            chatHistory[existingIndex].lastInteraction = currentTime;
            localStorage.setItem('cordchain_chatHistory', JSON.stringify(chatHistory));
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
                
                localStorage.setItem(`cordchain_chat_${this.sessionId}_messages`, JSON.stringify(messages));
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
            const formattedContent = content
                .replace(/\n/g, '<br>')
                .replace(/  /g, '&nbsp;&nbsp;');
            messageDiv.innerHTML = formattedContent;
        } else {
            messageDiv.textContent = content;
        }
        
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
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