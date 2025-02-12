class AdBlocker {
    constructor() {
        this.initialized = false;
        this.isEnabled = true;
        this.customSelectors = [];
        
        // Initialize the blocker
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        // Load settings from storage
        await this.loadSettings();
        
        // Initial cleanup
        this.cleanPage();
        
        // Set up observer for dynamic content
        this.setupObserver();
        
        // Listen for messages from background script
        this.setupMessageListener();
        
        this.initialized = true;
        console.log('AdBlocker initialized'); // Debug log
    }

    async loadSettings() {
        try {
            const settings = await chrome.storage.sync.get({
                isEnabled: true,
                customSelectors: [],
                whitelist: []
            });
            
            // Check if current domain is whitelisted
            const currentDomain = window.location.hostname;
            this.isEnabled = settings.isEnabled && 
                           !settings.whitelist.includes(currentDomain);
            this.customSelectors = settings.customSelectors;
            console.log('Settings loaded:', settings); // Debug log
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async updateHiddenElementsCount(increment = 1) {
        const stats = await chrome.storage.local.get(['elementsHidden']) || { elementsHidden: 0 };
        await chrome.storage.local.set({
            elementsHidden: stats.elementsHidden + increment
        });
    }

    hideCommonAds() {
        if (!this.isEnabled) return;
        
        let hiddenCount = 0;
        commonAdSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                if (element.style.display !== 'none') {
                    element.style.display = 'none';
                    hiddenCount++;
                }
            });
        });
        
        if (hiddenCount > 0) {
            this.updateHiddenElementsCount(hiddenCount);
        }
    }

    cleanPage() {
        if (!this.isEnabled) return;

        // Common ad selectors
        const commonSelectors = [
            // Ad-related classes and IDs
            '[class*="ad-"]', '[class*="ad_"]', '[id*="ad-"]', '[id*="ad_"]',
            '.ad', '.ads', '.advertisement', '.advertising', '.advert',
            // Specific ad containers
            '[class*="banner"]', '[id*="banner"]',
            'ins.adsbygoogle',
            // Social media popups
            '[class*="popup"]', '[id*="popup"]',
            '[class*="modal"]', '[id*="modal"]',
            // Newsletter and subscription popups
            '[class*="newsletter"]', '[id*="newsletter"]',
            '[class*="subscribe"]', '[id*="subscribe"]',
            // Common ad providers
            'div[data-ad]', 'div[data-ads]', 'div[data-adunit]',
            // Specific ad slots
            'div[id*="gpt"]', 'div[id*="dfp"]',
            // Generic containers often used for ads
            'aside[role="complementary"]',
            // Cookie notices and consent popups
            '[class*="cookie"]', '[id*="cookie"]',
            '[class*="consent"]', '[id*="consent"]'
        ];

        // Combine default and custom selectors
        const selectors = [...commonSelectors, ...this.customSelectors].join(',');

        try {
            const elements = document.querySelectorAll(selectors);
            console.log(`Found ${elements.length} ad elements`); // Debug log
            elements.forEach(element => {
                element.style.display = 'none';
                element.classList.add('clean-reading-hidden');
            });

            // Remove fixed positioning and overflow hidden from body
            document.body.style.removeProperty('position');
            document.body.style.removeProperty('overflow');
            document.documentElement.style.removeProperty('overflow');
        } catch (error) {
            console.error('Error cleaning page:', error);
        }
    }

    setupObserver() {
        if (!this.isEnabled) return;

        const observer = new MutationObserver((mutations) => {
            let shouldClean = false;
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    shouldClean = true;
                }
            });

            if (shouldClean) {
                this.cleanPage();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log('Observer setup complete'); // Debug log
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'SETTINGS_UPDATED') {
                this.loadSettings().then(() => {
                    if (this.isEnabled) {
                        this.cleanPage();
                    } else {
                        this.restorePage();
                    }
                });
            }
            sendResponse({ success: true });
        });
    }

    restorePage() {
        const hiddenElements = document.querySelectorAll('.clean-reading-hidden');
        hiddenElements.forEach(element => {
            element.style.display = '';
            element.classList.remove('clean-reading-hidden');
        });
    }
}

// Initialize the ad blocker
console.log('Content script loaded'); // Debug log
new AdBlocker();

class PageCleaner {
    
    constructor() {
        this.initialized = false;
        this.isEnabled = true;
        this.isReaderMode = false;
        this.customSelectors = [];
        this.hiddenElements = new Set();
        this.isSelectingElement = false;
        this.highlightedElement = null;
        this.createFloatingToolbar();
        this.setupMessageListener(); 
        this.hiddenElementsCount = 0;
        this.hideCommonAds();
        this.observeDOMChanges();
        this.adSelectors = [
            // Ad iframes
            'iframe[src*="ad"]', 'iframe[src*="ads"]', 'iframe[id*="google_ads"]',
            // Common ad containers
            '[class*="ad-container"]', '[id*="ad-container"]',
            '[class*="ad-wrapper"]', '[id*="ad-wrapper"]',
            '[class*="ad-unit"]', '[id*="ad-unit"]',
            // Google Ads
            'ins.adsbygoogle', '.adsbygoogle',
            'div[data-ad-client]', 'iframe[data-ad-client]',
            // Generic ad classes
            '[class*="advertisement"]', '[id*="advertisement"]',
            '[class*="banner-ad"]', '[id*="banner-ad"]',
            // Social & popup elements
            '[class*="social-share"]', '[id*="social-share"]',
            '[class*="newsletter-popup"]', '[id*="newsletter-popup"]',
            // Sponsored content
            '[class*="sponsored"]', '[id*="sponsored"]',
            '[class*="promoted"]', '[id*="promoted"]',
            // Specific ad providers
            '[class*="taboola"]', '[id*="taboola"]',
            '[class*="outbrain"]', '[id*="outbrain"]',
            // Cookie notices
            '[class*="cookie-banner"]', '[id*="cookie-banner"]',
            '[class*="gdpr"]', '[id*="gdpr"]',
            // Popups and overlays
            '[class*="popup"]', '[id*="popup"]',
            '[class*="modal"]', '[id*="modal"]',
            '[class*="overlay"]', '[id*="overlay"]',

            // Exoclick specific ads
            '[id*="exo_slider"]',
            '[class*="exo_wrapper"]',
            '[id*="exo_wrapper"]',
            '.exo_wrapper',
            '#exo_slider_*',
            '[class*="_lr"]',
            '[id*="_lr"]',
            
            // Video ads
            'div[id*="video_container"]',
            'div[id*="video-container"]',
            'div[class*="video-ad"]',
            'div[class*="video_ad"]',
            
            // Slider ads
            '[class*="slider_ad"]',
            '[id*="slider_ad"]',
            '[class*="slider-ad"]',
            '[id*="slider-ad"]',
            
            // Network specific
            '[src*=".aucdn.net"]',
            '[src*=".afcdn.net"]',
            'video[src*="aucdn.net"]',
            'img[src*="afcdn.net"]',
            
            // Additional generic ad elements
            '[class*="_wrapper"][class*="ad"]',
            '[id*="_wrapper"][id*="ad"]',
            'div[class*="cta_wrapper"]',
            'div[id*="cta_wrapper"]'
        ];


        this.addEmergencyStyles();
        this.init();
        this.startAdBlocking();
    }

    addEmergencyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .exo_wrapper,
            [id*="exo_slider"],
            [class*="exo_wrapper"],
            [id*="video_container"],
            [src*=".aucdn.net"],
            [src*=".afcdn.net"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                height: 0 !important;
                width: 0 !important;
                position: absolute !important;
                z-index: -9999 !important;
            }
        `;
        document.head.appendChild(style);
    }

    async startAdBlocking() {
        // Initial cleanup
        this.hideAds();
        
        // Set up observer for dynamic content
        const observer = new MutationObserver(() => {
            this.hideAds();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async hideAds() {
        if (!this.isEnabled) return;

        let newHiddenCount = 0;
        
        this.adSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(element => {
                    if (!element.classList.contains('clean-reading-hidden')) {
                        element.style.display = 'none';
                        element.style.visibility = 'hidden';
                        element.style.opacity = '0';
                        element.classList.add('clean-reading-hidden');
                        newHiddenCount++;
                    }
                });
            } catch (error) {
                console.warn('Error hiding ads:', error);
            }
        });

        if (newHiddenCount > 0) {
            this.hiddenElementsCount += newHiddenCount;
            await this.updateStats(newHiddenCount);
            console.log(`Hidden ${newHiddenCount} new ad elements. Total: ${this.hiddenElementsCount}`);
        }
    }

    async updateStats(increment) {
        try {
            // Get current stats
            const stats = await chrome.storage.local.get(['elementsHidden', 'lastUpdate']) || 
                         { elementsHidden: 0, lastUpdate: Date.now() };
            
            // Update stats
            const newCount = (stats.elementsHidden || 0) + increment;
            
            // Save updated stats
            await chrome.storage.local.set({
                elementsHidden: newCount,
                lastUpdate: Date.now()
            });

            // Notify popup about the update
            chrome.runtime.sendMessage({
                type: 'STATS_UPDATED',
                data: { elementsHidden: newCount }
            });
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async updateHiddenElementsCount(increment) {
        try {
            const stats = await chrome.storage.local.get(['elementsHidden']) || { elementsHidden: 0 };
            await chrome.storage.local.set({
                elementsHidden: stats.elementsHidden + increment
            });
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }


    createFloatingToolbar() {
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'clean-reading-toolbar';
        this.toolbar.setAttribute('data-clean-reading-toolbar', 'true');
        
        this.toolbar.innerHTML = `
            <div class="toolbar-content">
                <div class="toolbar-counter">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2ZM1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8Z" fill="currentColor"/>
                        <path d="M11.7071 5.70711C12.0976 5.31658 12.0976 4.68342 11.7071 4.29289C11.3166 3.90237 10.6834 3.90237 10.2929 4.29289L7 7.58579L5.70711 6.29289C5.31658 5.90237 4.68342 5.90237 4.29289 6.29289C3.90237 6.68342 3.90237 7.31658 4.29289 7.70711L6.29289 9.70711C6.68342 10.0976 7.31658 10.0976 7.70711 9.70711L11.7071 5.70711Z" fill="currentColor"/>
                    </svg>
                    <span class="hidden-count">0 items hidden</span>
                </div>
                <div class="toolbar-actions">
                    <button class="toolbar-button cancel-button">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.29289 2.29289C2.68342 1.90237 3.31658 1.90237 3.70711 2.29289L6 4.58579L8.29289 2.29289C8.68342 1.90237 9.31658 1.90237 9.70711 2.29289C10.0976 2.68342 10.0976 3.31658 9.70711 3.70711L7.41421 6L9.70711 8.29289C10.0976 8.68342 10.0976 9.31658 9.70711 9.70711C9.31658 10.0976 8.68342 10.0976 8.29289 9.70711L6 7.41421L3.70711 9.70711C3.31658 10.0976 2.68342 10.0976 2.29289 9.70711C1.90237 9.31658 1.90237 8.68342 2.29289 8.29289L4.58579 6L2.29289 3.70711C1.90237 3.31658 1.90237 2.68342 2.29289 2.29289Z" fill="currentColor"/>
                        </svg>
                        Cancel
                    </button>
                    <button class="toolbar-button done-button">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.7071 2.29289C11.0976 2.68342 11.0976 3.31658 10.7071 3.70711L5.70711 8.70711C5.31658 9.09763 4.68342 9.09763 4.29289 8.70711L1.29289 5.70711C0.902369 5.31658 0.902369 4.68342 1.29289 4.29289C1.68342 3.90237 2.31658 3.90237 2.70711 4.29289L5 6.58579L9.29289 2.29289C9.68342 1.90237 10.3166 1.90237 10.7071 2.29289Z" fill="currentColor"/>
                        </svg>
                        Done
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        this.toolbar.querySelector('.cancel-button').addEventListener('click', () => this.cancelSelection());
        this.toolbar.querySelector('.done-button').addEventListener('click', () => this.stopElementSelection());
        
        document.body.appendChild(this.toolbar);
        this.toolbar.style.display = 'none';
    }

    handleMouseMove(event) {
        if (!this.isSelectingElement) return;

        // Ignore if the element is part of our toolbar
        const element = document.elementFromPoint(event.clientX, event.clientY);
        if (!element || 
            element.closest('[data-clean-reading-toolbar]') || 
            element === this.highlightOverlay) {
            this.highlightOverlay.style.display = 'none';
            this.highlightedElement = null;
            return;
        }

        const rect = element.getBoundingClientRect();
        this.highlightOverlay.style.display = 'block';
        this.highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
        this.highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
        this.highlightOverlay.style.width = `${rect.width}px`;
        this.highlightOverlay.style.height = `${rect.height}px`;
        
        this.highlightedElement = element;
    }

    handleElementClick(event) {
        if (!this.isSelectingElement) return;
        
        // Ignore clicks on toolbar elements
        if (event.target.closest('[data-clean-reading-toolbar]')) {
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        if (this.highlightedElement) {
            const selector = this.generateSelector(this.highlightedElement);
            this.hideElement(this.highlightedElement);
            
            this.hiddenCount++;
            this.updateToolbarCounter();
            
            chrome.runtime.sendMessage({
                type: 'ELEMENT_HIDDEN',
                selector: selector
            });
        }
    }

    async init() {
        if (this.initialized) return;
        
        await this.loadSettings();
        this.setupMessageListener();
        this.createHighlightOverlay();
        this.cleanPage();
        this.setupObserver();
        
        this.initialized = true;
        console.log('PageCleaner initialized');
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get({
                isEnabled: true,
                isReaderMode: false,
                customSelectors: [],
                whitelist: [],
                hiddenSelectors: {}
            });
            
            const currentDomain = window.location.hostname;
            this.isEnabled = result.isEnabled && !result.whitelist.includes(currentDomain);
            this.isReaderMode = result.isReaderMode;
            this.customSelectors = result.customSelectors;
            this.domainHiddenSelectors = result.hiddenSelectors[currentDomain] || [];
            
            console.log('Settings loaded:', result);
            return result;
        } catch (error) {
            console.error('Error loading settings:', error);
            return {
                isEnabled: true,
                isReaderMode: false,
                customSelectors: [],
                whitelist: [],
                hiddenSelectors: {}
            };
        }
    }

    createHighlightOverlay() {
        this.highlightOverlay = document.createElement('div');
        this.highlightOverlay.className = 'clean-reading-highlight-overlay';
        this.highlightOverlay.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 2147483647;
            background: rgba(26, 115, 232, 0.2);
            border: 2px solid #1a73e8;
            display: none;
            transition: all 0.1s ease;
        `;
        document.body.appendChild(this.highlightOverlay);
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Received message:', request.type);
            
            switch (request.type) {
                case 'START_ELEMENT_SELECTION':
                    this.startElementSelection();
                    break;
                    
                case 'STOP_ELEMENT_SELECTION':
                    this.stopElementSelection();
                    break;
                    
                case 'RESTORE_HIDDEN_ELEMENTS':
                    this.restoreHiddenElements();
                    break;

                case 'UNDO_HIDDEN_ELEMENT':
                    this.undoHiddenElement(request.selector);
                    break;
            }
            
            sendResponse({ success: true });
            return true;
        });
    }

    

    

    stopElementSelection() {
        console.log('Stopping element selection');
        this.isSelectingElement = false;
        document.body.style.cursor = '';
        
        // Hide toolbar with animation
        this.toolbar.classList.add('toolbar-hiding');
        setTimeout(() => {
            this.toolbar.style.display = 'none';
            this.toolbar.classList.remove('toolbar-hiding');
        }, 300); // Match this with CSS animation duration
        
        // Remove event listeners
        document.removeEventListener('mousemove', this.handleMouseMoveBound);
        document.removeEventListener('click', this.handleElementClickBound, true);
        
        // Hide highlight overlay
        this.highlightOverlay.style.display = 'none';
        document.body.classList.remove('clean-reading-selecting');
    }

    startElementSelection() {
        console.log('Starting element selection'); // Debug log
        this.isSelectingElement = true;
        document.body.style.cursor = 'crosshair';
        
        // Show toolbar
        this.toolbar.style.display = 'block';
        document.body.classList.add('clean-reading-selecting');
        
        // Reset counter
        this.hiddenCount = 0;
        this.updateToolbarCounter();
        
        // Add event listeners
        this.handleMouseMoveBound = this.handleMouseMove.bind(this);
        this.handleElementClickBound = this.handleElementClick.bind(this);
        
        document.addEventListener('mousemove', this.handleMouseMoveBound);
        document.addEventListener('click', this.handleElementClickBound, true);
    }

    cancelSelection() {
        // Restore hidden elements from this session
        this.restoreRecentlyHidden();
        this.stopElementSelection();
    }

    async restoreRecentlyHidden() {
        // Only restore elements hidden in this selection session
        const recentSelectors = Array.from(this.hiddenElements)
            .slice(-this.hiddenCount);
            
        for (const selector of recentSelectors) {
            await this.undoHiddenElement(selector);
        }
        
        this.hiddenCount = 0;
        this.updateToolbarCounter();
    }

    updateToolbarCounter() {
        const counter = this.toolbar.querySelector('.hidden-count');
        counter.textContent = `${this.hiddenCount} items hidden`;
    }


    

    

    generateSelector(element) {
        // Try ID
        if (element.id) {
            return `#${element.id}`;
        }

        // Try classes
        if (element.classList.length) {
            const classes = Array.from(element.classList)
                .filter(cls => !cls.includes('clean-reading-'))
                .join('.');
            if (classes) {
                return `.${classes}`;
            }
        }

        // Try tag with parent context
        let selector = element.tagName.toLowerCase();
        let parent = element.parentElement;
        let index = Array.from(parent.children).indexOf(element);
        
        return `${selector}:nth-child(${index + 1})`;
    }

    async hideElement(element) {
        const selector = this.generateSelector(element);
        if (!selector) return;

        // Add hiding animation class
        element.classList.add('clean-reading-hiding');

        // Wait for animation to complete
        await new Promise(resolve => {
            element.addEventListener('animationend', () => {
                element.style.display = 'none';
                element.classList.remove('clean-reading-hiding');
                element.classList.add('clean-reading-hidden');
                resolve();
            }, { once: true });
        });

        this.hiddenElements.add(selector);
        await this.saveHiddenElement(selector);
        return selector;
    }

    async saveHiddenElement(selector) {
        const currentDomain = window.location.hostname;
        const settings = await chrome.storage.sync.get({ hiddenSelectors: {} });
        
        settings.hiddenSelectors[currentDomain] = settings.hiddenSelectors[currentDomain] || [];
        if (!settings.hiddenSelectors[currentDomain].includes(selector)) {
            settings.hiddenSelectors[currentDomain].push(selector);
            await chrome.storage.sync.set({ hiddenSelectors: settings.hiddenSelectors });
        }
    }

    setupObserver() {
        if (!this.isEnabled) return;

        const observer = new MutationObserver((mutations) => {
            let shouldClean = false;
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    shouldClean = true;
                }
            });

            if (shouldClean) {
                this.cleanPage();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    cleanPage() {
        if (!this.isEnabled) return;
        
        // Apply hidden elements for this domain
        if (this.domainHiddenSelectors) {
            this.domainHiddenSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    element.style.display = 'none';
                    element.classList.add('clean-reading-hidden');
                });
            });
        }
    }

    async restoreHiddenElements() {
        const elements = document.querySelectorAll('.clean-reading-hidden');
        elements.forEach(element => {
            element.style.display = '';
            element.classList.remove('clean-reading-hidden');
        });

        // Clear stored hidden elements for this domain
        const currentDomain = window.location.hostname;
        const settings = await chrome.storage.sync.get({ hiddenSelectors: {} });
        delete settings.hiddenSelectors[currentDomain];
        await chrome.storage.sync.set({ hiddenSelectors: settings.hiddenSelectors });
        
        this.hiddenElements.clear();
    }

    async undoHiddenElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            // Remove hidden class and show element
            element.classList.remove('clean-reading-hidden');
            element.style.display = '';
            
            // Add showing animation
            element.classList.add('clean-reading-showing');
            
            // Remove animation class after it completes
            await new Promise(resolve => {
                element.addEventListener('animationend', () => {
                    element.classList.remove('clean-reading-showing');
                    resolve();
                }, { once: true });
            });
        }

        // Remove from storage
        const currentDomain = window.location.hostname;
        const settings = await chrome.storage.sync.get({ hiddenSelectors: {} });
        if (settings.hiddenSelectors[currentDomain]) {
            settings.hiddenSelectors[currentDomain] = settings.hiddenSelectors[currentDomain]
                .filter(s => s !== selector);
            await chrome.storage.sync.set({ hiddenSelectors: settings.hiddenSelectors });
        }

        this.hiddenElements.delete(selector);
    }

    hideCommonAds() {
        if (!this.isEnabled) return;
        
        const commonAdSelectors = [
            '.advertisement',
            '.ad-container',
            '.ad-wrapper',
            '.ad-box',
            '.ad-banner',
            '.ad-section',
            '[class*="ad-"]',
            '[id*="ad-"]',
            '[class*="advertisement"]',
            '[id*="advertisement"]',
            'ins.adsbygoogle',
            '.google-ad',
            '.sponsored-content',
            '.promoted-content',
            '.sponsored',
            '.promoted'
        ];
        
        commonAdSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                element.style.display = 'none';
            });
        });
    }

    observeDOMChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    this.hideCommonAds();
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Initialize the page cleaner
console.log('Initializing PageCleaner');
new PageCleaner();