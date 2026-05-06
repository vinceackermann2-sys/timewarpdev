// TimeWarp Content Script
// Runs on every page — provides page context to background worker

// ── Ping/pong — lets any page or injected script detect the extension ─────────
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  // ── Ping ──────────────────────────────────────────────────────────────────
  if (event.data === "TIMEWARP_PING" || event.data?.type === "TIMEWARP_PING") {
    window.postMessage("TIMEWARP_PONG", "*");
    return;
  }

  // ── Execute action ─────────────────────────────────────────────────────────
  // Listen for TIMEWARP_EXECUTE_ACTION from the webapp, forward to background.js
  // (which has chrome.tabs / chrome.scripting access), then post the result back.
  if (event.data?.type === "TIMEWARP_EXECUTE_ACTION") {
    const { action, executeInTab, targetGroupTab, focusGroup } = event.data;

    chrome.runtime.sendMessage(
      { type: "TIMEWARP_EXECUTE_ACTION", action, executeInTab, targetGroupTab, focusGroup },
      (response) => {
        window.postMessage({
          type: "TIMEWARP_ACTION_RESULT",
          payload: response || { success: false, action: action?.action || action?.type || "unknown", error: "No response from background" },
        }, "*");
      }
    );
  }

  // ── Session start — create tab group, post TIMEWARP_GROUP_READY when done ──
  if (event.data?.type === "TIMEWARP_EMPLOYEE_START") {
    chrome.runtime.sendMessage(
      { type: "TIMEWARP_EMPLOYEE_START", payload: event.data.payload || event.data },
      (response) => {
        // Webapp awaits TIMEWARP_GROUP_READY before executing steps
        window.postMessage({
          type: "TIMEWARP_GROUP_READY",
          payload: response || { success: false, error: "No response from background" },
        }, "*");
      }
    );
  }

  // ── Get page context from group tab ───────────────────────────────────────
  if (event.data?.type === "TIMEWARP_GET_PAGE_CONTEXT") {
    chrome.runtime.sendMessage(
      { type: "TIMEWARP_GET_PAGE_CONTEXT", tabId: event.data.tabId || null, targetGroupTab: event.data.targetGroupTab || false },
      (response) => {
        window.postMessage({
          type: "TIMEWARP_PAGE_CONTEXT",
          payload: response?.context || response || {},
        }, "*");
      }
    );
  }

  // ── Overlay update — ONLY forward to background, don't render here ──────────
  // Guard: only relay if the message came from the webapp page itself (not from
  // a re-dispatch), preventing background→content→background infinite loops.
  if (event.data?.type === "TIMEWARP_OVERLAY_UPDATE") {
    chrome.runtime.sendMessage({ type: "TIMEWARP_OVERLAY_UPDATE", ...event.data });
    return;
  }

  // ── Session stop — close tab group if requested ────────────────────────────
  if (event.data?.type === "TIMEWARP_EMPLOYEE_STOP") {
    chrome.runtime.sendMessage(
      { type: "TIMEWARP_EMPLOYEE_STOP", payload: event.data.payload || event.data },
      (response) => {
        window.postMessage({
          type: "TIMEWARP_EMPLOYEE_STOP_ACK",
          payload: response || { success: false, error: "No response from background" },
        }, "*");
      }
    );
  }
});

// Listen for context requests from the side panel (via background)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Synchronous — reply immediately.
  if (message.type === "TIMEWARP_PING") {
    sendResponse({ type: "TIMEWARP_PONG" });
    return true;
  }

  // Overlay forwarded from background — render directly in this tab.
  // Do NOT re-dispatch to window (that would loop: window→background→tab→window→…)
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
          <div style="width:8px;height:8px;border-radius:50%;background:${s.isPaused ? '#f59e0b' : '#22c55e'};animation:${s.isPaused ? 'none' : 'pulse 2s infinite'};"></div>
          <span style="font-size:13px;font-weight:600;">${s.employeeName || 'AI Employee'}</span>
        </div>
        <p style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;">${statusText}</p>
        ${safetyHtml}
      </div>
      <style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}</style>
    `;

    sendResponse({ ok: true });
    return true;
  }

  // Synchronous — reply immediately.
  if (message.type === "GET_PAGE_CONTEXT") {
    sendResponse(getPageContext());
    return true;
  }

  // Asynchronous: forward TIMEWARP_EXECUTE_ACTION to background and relay result.
  // return true is required — keeps the message channel open until background responds.
  if (message.type === "TIMEWARP_EXECUTE_ACTION") {
    chrome.runtime.sendMessage(
      {
        type: "TIMEWARP_EXECUTE_ACTION",
        action: message.action,
        tabId: message.tabId || null,
        requestId: message.requestId,
      },
      (response) => {
        const result = response || { success: false, error: "No response from background" };
        sendResponse({
          success: result.success === true,
          action:  message.action?.type || "unknown",
          error:   result.success ? undefined : (result.error || "Action failed"),
          data:    result.data !== undefined ? result.data : (result.result !== undefined ? result.result : undefined),
        });
      }
    );
    return true; // ← keeps channel open for async reply
  }
});

function getPageContext() {
  const inputs = Array.from(document.querySelectorAll("input, textarea, select"))
    .slice(0, 15)
    .map(el => ({
      tag: el.tagName,
      type: el.type || "",
      name: el.name || "",
      id: el.id || "",
      placeholder: el.placeholder || "",
      ariaLabel: el.getAttribute("aria-label") || ""
    }));

  const buttons = Array.from(document.querySelectorAll("button, [role='button'], a[href]"))
    .slice(0, 15)
    .map(el => ({
      text: el.textContent.trim().slice(0, 60),
      id: el.id || "",
      class: el.className?.toString().slice(0, 40) || ""
    }));

  const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
    .slice(0, 8)
    .map(h => h.textContent.trim().slice(0, 80));

  return {
    url: window.location.href,
    title: document.title,
    summary: document.body.innerText.slice(0, 800).replace(/\s+/g, " "),
    inputs,
    buttons,
    headings
  };
}
