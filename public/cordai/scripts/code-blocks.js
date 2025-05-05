// Code Block Handler
class CodeBlockHandler {
    constructor() {
        this.initializePrism();
        this.setupMutationObserver();
    }

    initializePrism() {
        if (!window.Prism) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
            script.onload = () => this.loadPrismComponents();
            document.head.appendChild(script);

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
            document.head.appendChild(link);
        }
    }

    loadPrismComponents() {
        const components = ['javascript', 'python', 'bash', 'css', 'html', 'json', 'typescript', 'jsx', 'tsx'];
        components.forEach(lang => {
            const script = document.createElement('script');
            script.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-${lang}.min.js`;
            document.head.appendChild(script);
        });
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList?.contains('ai-message')) {
                        this.processMessage(node);
                    }
                });
            });
        });

        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            observer.observe(chatContainer, { childList: true, subtree: true });
        }
    }

    processMessage(messageNode) {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        let content = messageNode.innerHTML;

        while ((match = codeBlockRegex.exec(content)) !== null) {
            const language = match[1] || this.detectLanguage(match[2]) || 'plaintext';
            const code = match[2].trim();
            const replacement = this.createCodeBlock(code, language);
            content = content.replace(match[0], replacement);
        }

        messageNode.innerHTML = content;
        this.initializeCopyButtons();
        
        if (window.Prism) {
            Prism.highlightAll();
        }
    }

    detectLanguage(code) {
        // Enhanced language detection
        if (code.includes('function') || code.includes('const') || code.includes('let') || code.includes('var')) return 'javascript';
        if (code.includes('import React') || code.includes('export default') || code.includes('jsx')) return 'jsx';
        if (code.includes('class') && code.includes('def')) return 'python';
        if (code.includes('<html') || code.includes('</div>')) return 'html';
        if (code.includes('{') && code.includes('}') && code.includes(':')) return 'css';
        if (code.includes('interface') || code.includes('type ') || code.includes(': string')) return 'typescript';
        return 'plaintext';
    }

    createCodeBlock(code, language) {
        return `
            <div class="code-block">
                <div class="code-block-header">
                    <span class="language-label">${language}</span>
                    <button class="copy-button" data-code="${this.escapeHtml(code)}">
                        <svg class="copy-icon" viewBox="0 0 24 24">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                        <span>Copy</span>
                    </button>
                </div>
                <div class="code-content">
                    <pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>
                </div>
            </div>
        `;
    }

    initializeCopyButtons() {
        document.querySelectorAll('.copy-button:not([data-initialized])').forEach(button => {
            button.setAttribute('data-initialized', 'true');
            button.addEventListener('click', () => this.copyCode(button));
        });
    }

    async copyCode(button) {
        const code = button.dataset.code;
        try {
            await navigator.clipboard.writeText(code);
            this.showCopySuccess(button);
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showCopyError(button);
        }
    }

    showCopySuccess(button) {
        const originalContent = button.innerHTML;
        button.classList.add('copied');
        button.innerHTML = '<svg class="check-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg><span>Copied!</span>';
        
        setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = originalContent;
        }, 2000);
    }

    showCopyError(button) {
        const originalContent = button.innerHTML;
        button.classList.add('error');
        button.innerHTML = '<svg class="error-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><span>Error!</span>';
        
        setTimeout(() => {
            button.classList.remove('error');
            button.innerHTML = originalContent;
        }, 2000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    new CodeBlockHandler();
});