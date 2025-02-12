# Clean Reading

A Chrome extension for distraction-free web browsing. Block ads, remove popups, and enjoy a cleaner reading experience.

## Features

- 🚫 Powerful Ad Blocking
- 🎯 Element Picker
- ⚡ Performance Focused
- 🔒 Privacy Friendly
- 📱 Responsive Design
- 🌙 Dark Mode Support

## Installation

1. Clone the repository:
```bash
git clone https://github.com/[your-username]/clean-reading.git
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode"

4. Click "Load unpacked" and select the extension directory

## Development

```bash
# Install dependencies (if you add any in the future)
npm install

# Build for production
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Privacy

This extension does not collect any personal data. All settings are stored locally.

# Clean Reading - User Guide

## Getting Started
1. Install the extension from Chrome Web Store
2. Click the extension icon to access controls
3. Enable desired features:
   - Ad Blocking
   - Reader Mode
   - Element Hiding

## Features Guide

### Ad Blocking
- Toggle to enable/disable
- Automatically removes common advertisements
- No configuration needed

### Element Hiding
1. Click "Select Elements to Hide"
2. Hover over unwanted elements
3. Click to hide them
4. Use toolbar to:
   - View hidden count
   - Undo actions
   - Finish selection

### Reader Mode
- Transforms articles into clean format
- Maintains original content
- Improves readability

### Whitelist
- Toggle to whitelist current site
- Disables all features on whitelisted sites
- Easily manage trusted websites

## Troubleshooting
Common issues and solutions...

# Clean Reading - File Structure

```
clean-reading/
├── icons/
│   └── logo.png
├── src/
│   ├── content/
│   │   ├── content.js
│   │   └── content.css
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
├── docs/
│   └── README.md
├── store/
│   ├── privacy-policy.md
│   ├── store-description.md
│   ├── screenshots.md
│   └── screenshots/
│       ├── main-interface.png
│       ├── element-hiding.png
│       ├── reader-mode.png
│       └── settings.png
├── manifest.json
└── README.md
```

