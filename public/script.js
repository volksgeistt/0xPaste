let currentPasteId = 1;

const API_BASE = ''; 

document.addEventListener('DOMContentLoaded', function() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    renderRecentPastes();
    setupEventListeners();
    
    handleRouting();
});

function setupEventListeners() {
    const privateCheckbox = document.getElementById('private-paste');
    if (privateCheckbox) {
        privateCheckbox.addEventListener('change', function() {
            const icon = document.getElementById('lock-icon');
            if (this.checked) {
                icon.classList.remove('hidden');
                icon.parentElement.classList.add('bg-white/20');
            } else {
                icon.classList.add('hidden');
                icon.parentElement.classList.remove('bg-white/20');
            }
        });
    }

    window.addEventListener('popstate', function(e) {
        handleRouting();
    });
}

function handleRouting() {
    const hash = window.location.hash;
    
    if (hash.startsWith('#/')) {
        const pasteUrl = hash.substring(2);
        if (pasteUrl) {
            viewPasteByUrl(pasteUrl);
            return;
        }
    }
    
    showHome();
}

function updateCharCount() {
    const content = document.getElementById('paste-content');
    const charCount = document.getElementById('char-count');
    if (content && charCount) {
        charCount.textContent = content.value.length;
    }
}

async function createPaste() {
    const titleEl = document.getElementById('paste-title');
    const contentEl = document.getElementById('paste-content');
    const expirationEl = document.getElementById('expiration');
    const privateEl = document.getElementById('private-paste');

    if (!titleEl || !contentEl || !expirationEl || !privateEl) {
        showToast('Form elements not found', 'error');
        return;
    }

    const title = titleEl.value.trim();
    const content = contentEl.value.trim();
    const expiration = expirationEl.value;
    const isPrivate = privateEl.checked;

    if (!content) {
        showToast('Please enter some content', 'error');
        return;
    }

    const createBtn = document.querySelector('button[onclick="createPaste()"]');
    const originalText = createBtn?.innerHTML;
    if (createBtn) {
        createBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i><span>Creating...</span>';
        createBtn.disabled = true;
    }

    try {
        const response = await fetch(`${API_BASE}/api/pastes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title || 'Untitled',
                content: content,
                expiration: expiration,
                isPrivate: isPrivate
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create paste');
        }

        showToast('Paste created! URL copied to clipboard');
        
        copyToClipboard(result.shareUrl);
        
        titleEl.value = '';
        contentEl.value = '';
        privateEl.checked = false;
        const lockIcon = document.getElementById('lock-icon');
        if (lockIcon) {
            lockIcon.classList.add('hidden');
            lockIcon.parentElement.classList.remove('bg-white/20');
        }
        updateCharCount();
        
        renderRecentPastes();
        
        viewPasteByUrl(result.url);

    } catch (error) {
        console.error('Error creating paste:', error);
        showToast(error.message || 'Failed to create paste', 'error');
    } finally {
        if (createBtn && originalText) {
            createBtn.innerHTML = originalText;
            createBtn.disabled = false;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }
}

async function renderRecentPastes() {
    const container = document.getElementById('recent-pastes');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/api/pastes?limit=6`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const recentPastes = await response.json();

        if (recentPastes.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="glass-morphism rounded-3xl p-8">
                        <div class="w-16 h-16 glass-morphism-strong rounded-2xl flex items-center justify-center mx-auto mb-4 neon-glow">
                            <i data-lucide="file-plus" class="w-8 h-8 text-neon-blue"></i>
                        </div>
                        <h3 class="text-xl font-semibold text-white mb-2">No pastes yet</h3>
                        <p class="text-gray-400">Create your first paste to get started!</p>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = recentPastes.map(paste => `
                <div class="paste-card glass-morphism rounded-2xl p-6 cursor-pointer hover:bg-white/10" onclick="viewPasteByUrl('${paste.url}')">
                    <div class="flex items-start justify-between mb-4">
                        <h3 class="font-semibold text-white truncate flex-1">${escapeHtml(paste.title)}</h3>
                        <span class="text-xs text-gray-400 ml-2">${formatTimeAgo(paste.createdAt)}</span>
                    </div>
                    
                    <div class="code-area rounded-xl p-3 mb-4 text-sm font-mono text-gray-300 h-20 overflow-hidden">
                        <div class="whitespace-pre-wrap">${escapeHtml(truncateText(paste.content, 100))}</div>
                    </div>
                    
                    <div class="flex items-center justify-between text-xs text-gray-400">
                        <div class="flex items-center space-x-3">
                            <span class="flex items-center">
                                <i data-lucide="eye" class="w-3 h-3 mr-1"></i>
                                ${paste.views || 0}
                            </span>
                            <span>${paste.content.length} chars</span>
                        </div>
                        <span class="capitalize">${paste.expiration?.replace('day', ' day').replace('week', ' week').replace('month', ' month') || 'Never'}</span>
                    </div>
                </div>
            `).join('');
        }
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error fetching recent pastes:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="glass-morphism rounded-3xl p-8">
                    <div class="w-16 h-16 glass-morphism-strong rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="alert-circle" class="w-8 h-8 text-red-400"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-2">Failed to load pastes</h3>
                    <p class="text-gray-400">Please try again later. Server may not be running.</p>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

async function viewPasteByUrl(pasteUrl) {
    try {
        const createSection = document.getElementById('create-section');
        const recentSection = document.getElementById('recent-section');
        const viewSection = document.getElementById('view-section');

        if (createSection) createSection.classList.add('hidden');
        if (recentSection) recentSection.classList.add('hidden');
        if (viewSection) viewSection.classList.remove('hidden');

        const pasteDisplay = document.getElementById('paste-display');
        if (pasteDisplay) {
            pasteDisplay.innerHTML = `
                <div class="flex items-center justify-center py-20">
                    <div class="text-center">
                        <i data-lucide="loader" class="w-8 h-8 text-neon-blue mx-auto mb-4 animate-spin"></i>
                        <p class="text-gray-400">Loading paste...</p>
                    </div>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        const response = await fetch(`${API_BASE}/api/pastes/${encodeURIComponent(pasteUrl)}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Paste not found or expired');
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        }
        
        const paste = await response.json();

        if (window.location.hash !== `#/${pasteUrl}`) {
            window.history.pushState({}, '', `#/${pasteUrl}`);
        }

        const shareUrl = `${window.location.origin}${window.location.pathname}#/${paste.url}`;

        const pasteHeader = document.getElementById('paste-header');
        if (pasteHeader) {
            pasteHeader.innerHTML = `
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-4 sm:space-y-0">
                    <div class="flex-1">
                        <h1 class="text-2xl font-bold text-white mb-1">${escapeHtml(paste.title)}</h1>
                        <p class="text-gray-400 text-sm">${formatTimeAgo(paste.createdAt)} • ${paste.views} views • ${paste.content.length} characters</p>
                    </div>
                    <div class="flex items-center space-x-3 flex-shrink-0">
                        <button onclick="shareUrl('${shareUrl}')" class="glass-morphism px-4 py-2 rounded-xl text-gray-300 hover:text-white transition-all duration-300 flex items-center space-x-2 hover:bg-white/10">
                            <i data-lucide="share-2" class="w-4 h-4"></i>
                            <span>Share</span>
                        </button>
                        <button onclick="copyPasteContent('${paste.url}')" class="glass-morphism px-4 py-2 rounded-xl text-gray-300 hover:text-white transition-all duration-300 flex items-center space-x-2 hover:bg-white/10">
                            <i data-lucide="copy" class="w-4 h-4"></i>
                            <span>Copy</span>
                        </button>
                        <button onclick="downloadPaste('${paste.url}')" class="glass-morphism px-4 py-2 rounded-xl text-gray-300 hover:text-white transition-all duration-300 flex items-center space-x-2 hover:bg-white/10">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            <span>Download</span>
                        </button>
                    </div>
                </div>
                <div class="glass-morphism-strong rounded-xl p-3 mb-4">
                    <div class="flex items-center space-x-2">
                        <i data-lucide="link" class="w-4 h-4 text-neon-blue"></i>
                        <span class="text-sm text-gray-300">Share URL:</span>
                        <code class="flex-1 text-sm font-mono text-neon-blue bg-black/20 px-2 py-1 rounded break-all">${shareUrl}</code>
                        <button onclick="copyToClipboard('${shareUrl}')" class="text-gray-400 hover:text-white transition-colors flex-shrink-0">
                            <i data-lucide="clipboard" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        if (pasteDisplay) {
            pasteDisplay.innerHTML = `
                <div class="mb-4 flex items-center justify-between">
                    <div class="flex space-x-2">
                        <div class="w-3 h-3 rounded-full bg-red-500"></div>
                        <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div class="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span class="text-gray-400 text-sm font-mono">${paste.title.toLowerCase().replace(/\s+/g, '_')}.txt</span>
                </div>
                <pre class="text-gray-200 font-mono text-sm leading-relaxed whitespace-pre-wrap overflow-x-auto">${escapeHtml(paste.content)}</pre>
            `;
        }

        window.currentPaste = paste;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

    } catch (error) {
        console.error('Error fetching paste:', error);
        showHome();
        showToast(error.message || 'Paste not found', 'error');
    }
}

function showHome() {
    if (window.location.hash !== '') {
        window.history.pushState({}, '', window.location.pathname);
    }
    
    const viewSection = document.getElementById('view-section');
    const createSection = document.getElementById('create-section');
    const recentSection = document.getElementById('recent-section');

    if (viewSection) viewSection.classList.add('hidden');
    if (createSection) createSection.classList.remove('hidden');
    if (recentSection) recentSection.classList.remove('hidden');
    
    window.currentPaste = null;
}

function shareUrl(url) {
    if (navigator.share) {
        navigator.share({
            title: '0xPaste - Shared Paste',
            url: url
        }).catch(console.error);
    } else {
        copyToClipboard(url);
        showToast('Share URL copied to clipboard!');
    }
}

function copyPasteContent(pasteUrl) {
    const paste = window.currentPaste;
    if (!paste) {
        showToast('Paste data not found', 'error');
        return;
    }

    copyToClipboard(paste.content);
    showToast('Content copied to clipboard!');
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!');
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('Copied to clipboard!');
    } catch (err) {
        showToast('Failed to copy', 'error');
        console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
}

function downloadPaste(pasteUrl) {
    const paste = window.currentPaste;
    if (!paste) {
        showToast('Paste data not found', 'error');
        return;
    }

    try {
        const blob = new Blob([paste.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${paste.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('File downloaded successfully!');
    } catch (error) {
        console.error('Download failed:', error);
        showToast('Download failed', 'error');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const messageEl = document.getElementById('toast-message');

    if (!toast || !icon || !messageEl) return;

    if (type === 'error') {
        icon.innerHTML = '<i data-lucide="x-circle" class="w-5 h-5 text-red-400"></i>';
    } else {
        icon.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5 text-green-400"></i>';
    }

    messageEl.textContent = message;

    toast.classList.remove('translate-x-full');
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return 'just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000);
        return `${months} month${months !== 1 ? 's' : ''} ago`;
    } else {
        const years = Math.floor(diffInSeconds / 31536000);
        return `${years} year${years !== 1 ? 's' : ''} ago`;
    }
}

window.createPaste = createPaste;
window.updateCharCount = updateCharCount;
window.viewPasteByUrl = viewPasteByUrl;
window.showHome = showHome;
window.shareUrl = shareUrl;
window.copyPasteContent = copyPasteContent;
window.copyToClipboard = copyToClipboard;
window.downloadPaste = downloadPaste;
