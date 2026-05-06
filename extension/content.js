// TimeWarp Content Script v1.0.4
// Bridges trusted TimeWarp web origins to the background service worker.

const TRUSTED_ORIGINS = [
  "https://timewarpdev.com",
  "https://www.timewarpdev.com",
  "https://timewarpdev.lovable.app",
];
const TRUSTED_HOST_PATTERNS = [
  /\.lovable\.app$/i,
  /\.lovableproject\.com$/i,
];

function isTrustedOrigin(origin) {
  if (!origin || typeof origin !== "string") return false;
  if (TRUSTED_ORIGINS.includes(origin)) return true;
  try {
    const u = new URL(origin);
    return TRUSTED_HOST_PATTERNS.some((p) => p.test(u.hostname));
  } catch {
    return false;
  }
}

function post(payload) {
  // Tag every outgoing message with a source so the web app can verify it
  // came from the real extension (not from another tab/page).
  window.postMessage({ source: "timewarp-extension", ...payload }, "*");
}

// Announce ourselves to whoever is listening on this page (the TimeWarp app).
try {
  document.documentElement.setAttribute("data-timewarp-extension", "1.0.4");
  post({ type: "TIMEWARP_EXTENSION_READY", version: "1.0.4" });
} catch { /* noop */ }

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (!isTrustedOrigin(event.origin)) return;
  const data = event.data;

  // ── Ping ──
  if (data === "TIMEWARP_PING" || data?.type === "TIMEWARP_PING") {
    post({ type: "TIMEWARP_PONG", version: "1.0.4" });
    return;
  }

  // ── Execute action ──
  if (data?.type === "TIMEWARP_EXECUTE_ACTION") {
    const { action, executeInTab, targetGroupTab, focusGroup } = data;
    chrome.runtime.sendMessage(
      { type: "TIMEWARP_EXECUTE_ACTION", action, executeInTab, targetGroupTab, focusGroup },
      (response) => {
        post({
          type: "TIMEWARP_ACTION_RESULT",
          payload: response || { success: false, action: action?.action || action?.type || "unknown", error: "No response from background" },
        });
      },
    );
    return;
  }

  // ── Session start ──
  if (data?.type === "TIMEWARP_EMPLOYEE_START" || data?.type === "TIMEWARP_OPEN_GROUP_TAB") {
    chrome.runtime.sendMessage(
      { type: "TIMEWARP_EMPLOYEE_START", payload: data.payload || data },
      (response) => {
        post({
          type: "TIMEWARP_GROUP_READY",
          payload: response || { success: false, error: "No response from background" },
        });
      },
    );
    return;
  }

  // ── Page context ──
  if (data?.type === "TIMEWARP_GET_PAGE_CONTEXT") {
    chrome.runtime.sendMessage(
      { type: "TIMEWARP_GET_PAGE_CONTEXT", tabId: data.tabId || null, targetGroupTab: data.targetGroupTab || false },
      (response) => {
        post({
          type: "TIMEWARP_PAGE_CONTEXT",
          payload: response?.context || response || {},
        });
      },
    );
    return;
  }

  // ── Overlay update ──
  if (data?.type === "TIMEWARP_OVERLAY_UPDATE") {
    chrome.runtime.sendMessage({ type: "TIMEWARP_OVERLAY_UPDATE", ...data });
    return;
  }

  // ── Session stop ──
  if (data?.type === "TIMEWARP_EMPLOYEE_STOP") {
    chrome.runtime.sendMessage(
      { type: "TIMEWARP_EMPLOYEE_STOP", payload: data.payload || data },
      (response) => {
        post({
          type: "TIMEWARP_EMPLOYEE_STOP_ACK",
          payload: response || { success: false, error: "No response from background" },
        });
      },
    );
    return;
  }

  // ── Auth bridge ── relay session token from app → background ──
  // Only accepted from trusted TimeWarp origins (origin already checked above).
  if (data?.type === "TIMEWARP_AUTH_DELIVER" && data.session && data.nonce) {
    chrome.runtime.sendMessage({ type: "TIMEWARP_AUTH_DELIVER", session: data.session, nonce: data.nonce }, (response) => {
      post({ type: "TIMEWARP_AUTH_DELIVER_ACK", payload: response || { success: false } });
    });
  }
});

// ── Background → page bridge ─────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TIMEWARP_PING") {
    sendResponse({ type: "TIMEWARP_PONG" });
    return true;
  }

  if (message.type === "TIMEWARP_OVERLAY_UPDATE") {
    const s = message;
    let overlay = document.getElementById("timewarp-overlay");
    if (!s.visible) {
      if (overlay) overlay.remove();
      sendResponse({ ok: true });
      return true;
    }
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "timewarp-overlay";
      overlay.style.cssText = "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:999999;font-family:-apple-system,system-ui,sans-serif;";
      document.body.appendChild(overlay);
    }
    const statusText = s.isManualMode ? "Manual takeover — you have control"
      : s.isPaused ? "Paused"
      : s.currentStep || "Running…";
    const safetyHtml = s.safetyAlert
      ? `<div style="margin-top:8px;padding:8px;border-radius:6px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);font-size:12px;color:#ef4444;">⚠️ ${s.safetyAlert}</div>`
      : "";
    overlay.innerHTML = `
      <div style="background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);border-radius:12px;padding:12px 16px;color:#fff;min-width:300px;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${s.isPaused ? '#f59e0b' : '#22c55e'};"></div>
          <span style="font-size:13px;font-weight:600;">${s.employeeName || 'TimeWarp'}</span>
        </div>
        <p style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;">${statusText}</p>
        ${safetyHtml}
      </div>
    `;
    sendResponse({ ok: true });
    return true;
  }
});
