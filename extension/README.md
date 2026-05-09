# TimeWarp Browser Extension

Secure Chromium extension for TimeWarp Computer mode.

## Install

1. Unzip the downloaded extension package.
2. Open `chrome://extensions` in Chrome, Edge, Brave, Arc, or another Chromium browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the unzipped `extension` folder.

## Sign in

Open the TimeWarp side panel, then sign in with email/password or Google. Google sign-in opens the TimeWarp web app in a new tab and securely returns the session to the extension.

## Security model

- The web app can only message this extension from trusted TimeWarp origins.
- Browser actions are routed through the extension background worker, not simulated by the app.
- Session tokens are stored in Chrome extension storage and are never embedded in page markup.
- Computer mode opens a real controlled tab and injects the overlay only into that working tab.