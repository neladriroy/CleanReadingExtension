class OptionsManager {
    constructor() {
        this.whitelistItems = document.getElementById('whitelistItems');
        this.selectorItems = document.getElementById('selectorItems');
        this.newSiteInput = document.getElementById('newSite');
        this.newSelectorInput = document.getElementById('newSelector');
        this.statusElement = document.getElementById('status');
        
        this.init();
    }

    async init() {
        // Load saved settings
        await this.loadSettings();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    async loadSettings() {
        const settings = await chrome.storage.sync.get({
            whitelist: [],
            customSelectors: []
        });

        // Render whitelist items
        this.renderWhitelist(settings.whitelist);
        
        // Render custom selectors
        this.renderSelectors(settings.customSelectors);
    }

    setupEventListeners() {
        // Add site to whitelist
        document.getElementById('addSite').addEventListener('click', () => {
            this.addWhitelistItem();
        });

        // Add custom selector
        document.getElementById('addSelector').addEventListener('click', () => {
            this.addSelectorItem();
        });

        // Save changes
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveChanges();
        });

        // Reset to defaults
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetToDefaults();
        });

        // Enter key handling for inputs
        this.newSiteInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addWhitelistItem();
        });

        this.newSelectorInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSelectorItem();
        });
    }

    renderWhitelist(whitelist) {
        this.whitelistItems.innerHTML = whitelist.map(domain => `
            <div class="item">
                <span>${domain}</span>
                <button class="remove-btn" data-domain="${domain}">Remove</button>
            </div>
        `).join('');

        // Add remove button listeners
        this.whitelistItems.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removeWhitelistItem(e.target.dataset.domain);
            });
        });
    }

    renderSelectors(selectors) {
        this.selectorItems.innerHTML = selectors.map(selector => `
            <div class="item">
                <span>${selector}</span>
                <button class="remove-btn" data-selector="${selector}">Remove</button>
            </div>
        `).join('');

        // Add remove button listeners
        this.selectorItems.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removeSelectorItem(e.target.dataset.selector);
            });
        });
    }

    async addWhitelistItem() {
        const domain = this.newSiteInput.value.trim().toLowerCase();
        if (!domain) return;

        const settings = await chrome.storage.sync.get({ whitelist: [] });
        if (!settings.whitelist.includes(domain)) {
            settings.whitelist.push(domain);
            await chrome.storage.sync.set({ whitelist: settings.whitelist });
            this.renderWhitelist(settings.whitelist);
            this.newSiteInput.value = '';
            this.showStatus('Site added to whitelist', 'success');
        }
    }

    async addSelectorItem() {
        const selector = this.newSelectorInput.value.trim();
        if (!selector) return;

        const settings = await chrome.storage.sync.get({ customSelectors: [] });
        if (!settings.customSelectors.includes(selector)) {
            settings.customSelectors.push(selector);
            await chrome.storage.sync.set({ customSelectors: settings.customSelectors });
            this.renderSelectors(settings.customSelectors);
            this.newSelectorInput.value = '';
            this.showStatus('Selector added', 'success');
        }
    }

    async removeWhitelistItem(domain) {
        const settings = await chrome.storage.sync.get({ whitelist: [] });
        settings.whitelist = settings.whitelist.filter(d => d !== domain);
        await chrome.storage.sync.set({ whitelist: settings.whitelist });
        this.renderWhitelist(settings.whitelist);
        this.showStatus('Site removed from whitelist', 'success');
    }

    async removeSelectorItem(selector) {
        const settings = await chrome.storage.sync.get({ customSelectors: [] });
        settings.customSelectors = settings.customSelectors.filter(s => s !== selector);
        await chrome.storage.sync.set({ customSelectors: settings.customSelectors });
        this.renderSelectors(settings.customSelectors);
        this.showStatus('Selector removed', 'success');
    }

    async saveChanges() {
        try {
            // Notify all tabs about the changes
            await chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
            this.showStatus('Settings saved successfully', 'success');
        } catch (error) {
            this.showStatus('Error saving settings', 'error');
        }
    }

    async resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            await chrome.storage.sync.set({
                whitelist: [],
                customSelectors: []
            });
            await this.loadSettings();
            this.showStatus('Settings reset to defaults', 'success');
        }
    }

    showStatus(message, type) {
        this.statusElement.textContent = message;
        this.statusElement.className = `status-message ${type}`;
        setTimeout(() => {
            this.statusElement.className = 'status-message';
        }, 3000);
    }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
});