class PopupManager {
    constructor() {
        // Initialize UI elements
        this.globalToggle = document.getElementById('globalToggle');
        this.readerModeToggle = document.getElementById('readerModeToggle');
        this.whitelistToggle = document.getElementById('whitelistToggle');
        this.hideElementBtn = document.getElementById('hideElementBtn');
        this.restoreElementsBtn = document.getElementById('restoreElementsBtn');
        this.statusElement = document.getElementById('status');
        this.optionsBtn = document.getElementById('optionsBtn');
        this.readerModeControls = document.getElementById('readerModeControls');
        this.adsBlockedCount = document.getElementById('adsBlockedCount');
        this.elementsHiddenCount = document.getElementById('elementsHiddenCount');
        

        // State
        this.currentDomain = '';
        this.hiddenCount = 0;
        this.setupMessageListener();
        this.init();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'STATS_UPDATED') {
                this.updateStats(0, message.data.elementsHidden);
            }
        });
    }

    async init() {
        // Get current tab's domain
        const tab = await this.getCurrentTab();
        this.currentDomain = new URL(tab.url).hostname;

        // Initialize toggle states
        await this.initializeState();
        
        // Set up event listeners
        this.setupEventListeners();

        // Update reader mode controls visibility
        this.updateReaderModeControls();
    }

    async getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }

    async initializeState() {
        const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
        const stats = await chrome.storage.local.get(['elementsHidden']);

        this.globalToggle.checked = response.isEnabled;
        this.whitelistToggle.checked = response.isWhitelisted;
        this.readerModeToggle.checked = response.readerMode || false;

        // Update stats display
        this.updateStats(0, stats.elementsHidden || 0);
        this.updateStatus();
    }


    updateStats(adsBlocked, elementsHidden) {
        if (this.adsBlockedCount) {
            this.adsBlockedCount.textContent = adsBlocked.toLocaleString();
        }
        if (this.elementsHiddenCount) {
            this.elementsHiddenCount.textContent = elementsHidden.toLocaleString();
        }
    }

    async resetStats() {
        await chrome.storage.local.set({
            elementsHidden: 0,
            lastUpdate: Date.now()
        });
        this.updateStats(0, 0);
    }

    setupEventListeners() {
        // Global toggle
        this.globalToggle.addEventListener('change', () => this.handleGlobalToggle());
        
        // Reader mode toggle
        this.readerModeToggle.addEventListener('change', () => this.handleReaderModeToggle());
        
        // Whitelist toggle
        this.whitelistToggle.addEventListener('change', () => this.handleWhitelistToggle());
        
        // Hide element button
        this.hideElementBtn.addEventListener('click', () => this.startElementSelection());
        
        // Restore elements button
        this.restoreElementsBtn.addEventListener('click', () => this.handleRestoreElements());
        
        // Options button
        this.optionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    }

    async handleGlobalToggle() {
        await chrome.runtime.sendMessage({ type: 'TOGGLE_ENABLED' });
        this.updateStatus();
    }

    async handleReaderModeToggle() {
        const isEnabled = this.readerModeToggle.checked;
        await chrome.runtime.sendMessage({ 
            type: 'TOGGLE_READER_MODE',
            enabled: isEnabled
        });
        this.updateReaderModeControls();
        this.updateStatus();
    }

    updateReaderModeControls() {
        if (this.readerModeToggle.checked) {
            this.readerModeControls.style.display = 'flex';
            this.readerModeControls.style.flexDirection = 'column';
        } else {
            this.readerModeControls.style.display = 'none';
        }
    }

    async handleWhitelistToggle() {
        await chrome.runtime.sendMessage({ 
            type: 'TOGGLE_WHITELIST',
            domain: this.currentDomain
        });
        this.updateStatus();
    }

    async startElementSelection() {
        const tab = await this.getCurrentTab();
        
        // Tell content script to start selection mode
        await chrome.tabs.sendMessage(tab.id, {
            type: 'START_ELEMENT_SELECTION'
        });

        // Close the popup
        window.close();
    }

    async handleRestoreElements() {
        const tab = await this.getCurrentTab();
        await chrome.tabs.sendMessage(tab.id, { 
            type: 'RESTORE_HIDDEN_ELEMENTS' 
        });
        this.updateStatus('Hidden elements restored');
    }

    updateStatus(message) {
        if (message) {
            this.statusElement.textContent = message;
            this.statusElement.classList.add('show');
            
            // Hide status after 3 seconds
            setTimeout(() => {
                this.statusElement.classList.remove('show');
                this.statusElement.textContent = '';
            }, 3000);
        } else {
            const status = this.globalToggle.checked 
                ? (this.whitelistToggle.checked 
                    ? 'Site is whitelisted' 
                    : 'Blocking ads on this site')
                : 'Ad blocking is disabled';
            
            this.statusElement.textContent = status;
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});