# Clean Reading Chrome Extension

This document outlines the design, flow, and features of a Google Chrome extension that hides ads and pop-ups to provide users with a clean, distraction-free reading experience. It is intended as a comprehensive guide for developers to implement and maintain the extension.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [App Flow](#app-flow)
5. [Technical Details](#technical-details)
    - [Project Structure](#project-structure)
    - [Manifest File](#manifest-file)
    - [Content Scripts](#content-scripts)
    - [Background Scripts](#background-scripts)
    - [Options Page](#options-page)
6. [Developer Notes](#developer-notes)
7. [Future Enhancements](#future-enhancements)
8. [Conclusion](#conclusion)

---

## Overview

The **Clean Reading** Chrome extension is designed to automatically hide advertisements and pop-ups on websites to ensure users enjoy a clean, distraction-free browsing and reading experience. It works by detecting ad-related elements on the page and either removing them from the DOM or hiding them with CSS. The extension is customizable, allowing users to enable or disable specific functionalities and even whitelist certain sites.

---

## Architecture

The extension is composed of the following primary components:

- **Manifest File:** Defines the extension's permissions, scripts, icons, and other metadata.
- **Content Scripts:** Injected into web pages to scan the DOM for ad/pop-up elements and hide them.
- **Background Script:** Manages persistent state, messaging between different parts of the extension, and handles global events.
- **Options Page:** Provides a user interface for configuring settings such as enabling/disabling the extension and managing whitelisted sites.

---

## Features

- **Ad and Pop-up Blocking:**  
  Detects and hides advertisement banners and pop-up dialogs using predefined CSS selectors and heuristics.

- **Dynamic Content Handling:**  
  Utilizes a `MutationObserver` to monitor and handle ads that are loaded dynamically after the initial page load.

- **Customizable Settings:**  
  An options page allows users to:
  - Enable/disable the extension.
  - Specify a list of whitelisted domains.
  - Add custom selectors for ad elements if necessary.

- **Minimal Performance Impact:**  
  Optimized to work seamlessly without significantly affecting page load times or browser performance.

- **User Interface Feedback:**  
  May include a toolbar icon with a popup indicating the extension's status and offering quick toggle options.

---

## App Flow

### 1. Initialization
- **Installation & Setup:**  
  Upon installation, default settings are established (e.g., enabling ad blocking and setting an empty whitelist).
  
- **Script Registration:**  
  The manifest registers the content scripts, background script, and options page, ensuring that the appropriate scripts load on matching URLs.

### 2. Page Load
- **Content Script Injection:**  
  When a user navigates to a webpage, the content script is automatically injected based on the match patterns defined in the manifest.
  
- **Initial Scan:**  
  The content script runs a function to immediately scan the page for elements matching known ad/pop-up selectors (e.g., elements with class names or IDs containing "ad", "popup", etc.) and applies CSS rules (e.g., `display: none;`) to hide them.

### 3. Dynamic Content Monitoring
- **MutationObserver Setup:**  
  The content script instantiates a `MutationObserver` to monitor changes in the DOM. This ensures that any dynamically inserted ad elements are detected and handled in real time.
  
- **Re-Scanning:**  
  Upon detecting new nodes, the observer triggers the ad-hiding functions to maintain a clean page view.

### 4. User Interaction
- **Toolbar Icon & Popup:**  
  The extension icon in the browser toolbar allows users to quickly toggle the ad blocking functionality on or off for the current page.
  
- **Options Page:**  
  Users can access a dedicated settings page to:
  - Toggle overall extension functionality.
  - Manage a whitelist of domains where the extension should be disabled.
  - Customize ad detection rules with additional CSS selectors if needed.

### 5. Background Processing
- **State Management:**  
  The background script handles storage and retrieval of user settings (using Chrome's `storage` API) and facilitates messaging between the options page and content scripts.
  
- **Event Handling:**  
  It listens for messages indicating changes in settings and applies these changes globally, ensuring consistency across all open tabs.

---

## Technical Details

### Project Structure
```
clean-reading/
├── manifest.json
├── src/
│   ├── content/
│   │   ├── content.js
│   │   └── content.css
│   ├── background/
│   │   └── background.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── options/
│       ├── options.html
│       ├── options.css
│       └── options.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── docs/
    └── CONTEXT.md
```

### Manifest File

The manifest file defines the extension's metadata, permissions, and which scripts to inject. Below is an example configuration using Manifest V3:

```json
{
  "manifest_version": 3,
  "name": "Clean Reading",
  "version": "1.0",
  "description": "Hide all ads and pop-ups for a distraction-free reading experience.",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "options.html"
}
