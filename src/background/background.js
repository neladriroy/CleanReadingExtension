class BackgroundManager {
    constructor() {
        this.init();
    }

    init() {
        // Handle installation and updates
        chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));
        
        // Handle messages from popup and content scripts
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    }

    async handleInstall(details) {
        if (details.reason === 'install') {
            // Set default settings on installation
            await chrome.storage.sync.set({
                isEnabled: true,
                isReaderMode: false,
                customSelectors: [],
                whitelist: [],
                hiddenSelectors: {},
                readerModeSettings: {
                    fontSize: '18px',
                    fontFamily: 'system-ui',
                    lineHeight: '1.6',
                    textAlign: 'left'
                }
            });
        }
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.type) {
            case 'GET_STATE':
                this.handleGetState(sender, sendResponse);
                return true;

            case 'TOGGLE_ENABLED':
                this.handleToggleEnabled(sendResponse);
                return true;

            case 'TOGGLE_READER_MODE':
                this.handleToggleReaderMode(request.enabled, sendResponse);
                return true;

            case 'TOGGLE_WHITELIST':
                this.handleToggleWhitelist(request.domain, sendResponse);
                return true;

            case 'SAVE_HIDDEN_ELEMENT':
                this.handleSaveHiddenElement(request.domain, request.selector, sendResponse);
                return true;

            case 'GET_READER_MODE_SETTINGS':
                this.handleGetReaderModeSettings(sendResponse);
                return true;

            case 'UPDATE_READER_MODE_SETTINGS':
                this.handleUpdateReaderModeSettings(request.settings, sendResponse);
                return true;
        }
    }

    async handleGetState(sender, sendResponse) {
        try {
            const settings = await chrome.storage.sync.get({
                isEnabled: true,
                isReaderMode: false,
                whitelist: []
            });

            const currentTab = sender.tab;
            const isWhitelisted = currentTab ? 
                settings.whitelist.includes(new URL(currentTab.url).hostname) : 
                false;

            sendResponse({
                isEnabled: settings.isEnabled,
                isReaderMode: settings.isReaderMode,
                isWhitelisted: isWhitelisted
            });
        } catch (error) {
            console.error('Error getting state:', error);
            sendResponse({ error: 'Failed to get state' });
        }
    }

    async handleToggleEnabled(sendResponse) {
        try {
            const settings = await chrome.storage.sync.get({ isEnabled: true });
            await chrome.storage.sync.set({ isEnabled: !settings.isEnabled });
            await this.notifyAllTabs({ type: 'SETTINGS_UPDATED' });
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error toggling enabled state:', error);
            sendResponse({ error: 'Failed to toggle enabled state' });
        }
    }

    async handleToggleReaderMode(enabled, sendResponse) {
        try {
            await chrome.storage.sync.set({ isReaderMode: enabled });
            await this.notifyAllTabs({ type: 'SETTINGS_UPDATED' });
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error toggling reader mode:', error);
            sendResponse({ error: 'Failed to toggle reader mode' });
        }
    }

    async handleToggleWhitelist(domain, sendResponse) {
        try {
            const settings = await chrome.storage.sync.get({ whitelist: [] });
            let whitelist = settings.whitelist;

            if (whitelist.includes(domain)) {
                whitelist = whitelist.filter(d => d !== domain);
            } else {
                whitelist.push(domain);
            }

            await chrome.storage.sync.set({ whitelist });
            await this.notifyAllTabs({ type: 'SETTINGS_UPDATED' });
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error toggling whitelist:', error);
            sendResponse({ error: 'Failed to toggle whitelist' });
        }
    }

    async handleSaveHiddenElement(domain, selector, sendResponse) {
        try {
            const settings = await chrome.storage.sync.get({ hiddenSelectors: {} });
            settings.hiddenSelectors[domain] = settings.hiddenSelectors[domain] || [];
            
            if (!settings.hiddenSelectors[domain].includes(selector)) {
                settings.hiddenSelectors[domain].push(selector);
                await chrome.storage.sync.set({ hiddenSelectors: settings.hiddenSelectors });
            }
            
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error saving hidden element:', error);
            sendResponse({ error: 'Failed to save hidden element' });
        }
    }

    async handleGetReaderModeSettings(sendResponse) {
        try {
            const settings = await chrome.storage.sync.get({
                readerModeSettings: {
                    fontSize: '18px',
                    fontFamily: 'system-ui',
                    lineHeight: '1.6',
                    textAlign: 'left'
                }
            });
            sendResponse({ settings: settings.readerModeSettings });
        } catch (error) {
            console.error('Error getting reader mode settings:', error);
            sendResponse({ error: 'Failed to get reader mode settings' });
        }
    }

    async handleUpdateReaderModeSettings(newSettings, sendResponse) {
        try {
            await chrome.storage.sync.set({ readerModeSettings: newSettings });
            await this.notifyAllTabs({ type: 'SETTINGS_UPDATED' });
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error updating reader mode settings:', error);
            sendResponse({ error: 'Failed to update reader mode settings' });
        }
    }

    async notifyAllTabs(message) {
        try {
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, message);
                } catch (error) {
                    // Ignore errors for tabs where content script isn't loaded
                    console.debug(`Could not send message to tab ${tab.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error notifying tabs:', error);
        }
    }
}

// Initialize the background manager
new BackgroundManager();

class AdBlocker {
    constructor() {
        this.isEnabled = true;
        this.whitelistedDomains = new Set();
        
        this.initializeState();
        this.setupMessageListener();
        this.setupStatsCounter();
    }

    async initializeState() {
        const state = await chrome.storage.local.get(['isEnabled', 'whitelistedDomains']);
        this.isEnabled = state.isEnabled ?? true;
        this.whitelistedDomains = new Set(state.whitelistedDomains || []);
        
        // Update rules based on initial state
        await this.updateRules();
    }

    setupStatsCounter() {
        chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener(
            async (info) => {
                const stats = await chrome.storage.local.get(['adsBlocked']) || { adsBlocked: 0 };
                await chrome.storage.local.set({
                    adsBlocked: stats.adsBlocked + 1
                });
            }
        );
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.type) {
                case 'GET_STATE':
                    sendResponse({
                        isEnabled: this.isEnabled,
                        isWhitelisted: this.whitelistedDomains.has(message.domain)
                    });
                    break;
                case 'TOGGLE_ENABLED':
                    this.isEnabled = !this.isEnabled;
                    this.updateRules();
                    this.saveState();
                    break;
                case 'TOGGLE_WHITELIST':
                    this.toggleWhitelist(message.domain);
                    break;
            }
            return true;
        });
    }

    async updateRules() {
        if (this.isEnabled) {
            await chrome.declarativeNetRequest.updateEnabledRulesets({
                enableRulesetIds: ["ruleset_1"]
            });
        } else {
            await chrome.declarativeNetRequest.updateEnabledRulesets({
                disableRulesetIds: ["ruleset_1"]
            });
        }
    }

    async toggleWhitelist(domain) {
        if (this.whitelistedDomains.has(domain)) {
            this.whitelistedDomains.delete(domain);
        } else {
            this.whitelistedDomains.add(domain);
        }
        await this.saveState();
    }

    async saveState() {
        await chrome.storage.local.set({
            isEnabled: this.isEnabled,
            whitelistedDomains: Array.from(this.whitelistedDomains)
        });
    }
}

// Initialize the ad blocker
const adBlocker = new AdBlocker();