// bridge.js — runs on TimeWarp app pages.
// Listens for window.postMessage from the app and translates them
// to chrome.runtime messages handled by background.js.

(function () {
  if (window.__TIMEWARP_BRIDGE_LOADED__) return;
  window.__TIMEWARP_BRIDGE_LOADED__ = true;

  const log = (...args) => console.log("[TimeWarp bridge]", ...args);
  log("loaded on", location.href);

  // Immediately announce ourselves so apps loaded before us still see a PONG.
  window.postMessage("TIMEWARP_PONG", "*");
  window.postMessage({ type: "TIMEWARP_PONG", version: chrome.runtime.getManifest().version }, "*");

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;

    // PING — string or object form
    if (data === "TIMEWARP_PING" || (data && data.type === "TIMEWARP_PING")) {
      window.postMessage("TIMEWARP_PONG", "*");
      window.postMessage({ type: "TIMEWARP_PONG", version: chrome.runtime.getManifest().version }, "*");
      return;
    }

    if (!data || typeof data !== "object" || !data.type) return;
    if (!data.type.startsWith("TIMEWARP_")) return;

    // Forward everything to the service worker.
    try {
      chrome.runtime.sendMessage(data, (response) => {
        if (chrome.runtime.lastError) {
          log("runtime error:", chrome.runtime.lastError.message);
          return;
        }
        if (response && response.type) {
          window.postMessage(response, "*");
        }
      });
    } catch (err) {
      log("forward failed:", err);
    }
  });

  // Allow the background to push events back to the page.
  chrome.runtime.onMessage.addListener((message) => {
    if (message && typeof message === "object" && typeof message.type === "string" && message.type.startsWith("TIMEWARP_")) {
      window.postMessage(message, "*");
    }
  });
})();
