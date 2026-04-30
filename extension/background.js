// background.js — service worker that mediates between the TimeWarp app
// (via bridge.js) and the active tab (via page-agent.js).

const log = (...args) => console.log("[TimeWarp bg]", ...args);

const state = {
  groupTabId: null,
  groupId: null,
  employee: null,
};

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function getTargetTab(targetGroupTab) {
  if (targetGroupTab && state.groupTabId) {
    try {
      const tab = await chrome.tabs.get(state.groupTabId);
      if (tab) return tab;
    } catch {
      state.groupTabId = null;
    }
  }
  return getActiveTab();
}

async function sendToTab(tabId, message) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          resolve(response);
        }
      });
    } catch (err) {
      resolve({ error: String((err && err.message) || err) });
    }
  });
}

async function ensureGroupTab(employeeName) {
  if (state.groupTabId) {
    try {
      await chrome.tabs.get(state.groupTabId);
      return state.groupTabId;
    } catch {
      state.groupTabId = null;
    }
  }
  const tab = await chrome.tabs.create({ url: "about:blank", active: false });
  state.groupTabId = tab.id;

  if (chrome.tabs.group) {
    try {
      const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
      state.groupId = groupId;
      if (chrome.tabGroups && chrome.tabGroups.update) {
        await chrome.tabGroups.update(groupId, {
          title: employeeName ? `TimeWarp · ${employeeName}` : "TimeWarp",
          color: "purple",
        });
      }
    } catch (err) {
      log("group failed:", err);
    }
  }
  return state.groupTabId;
}

async function closeGroupTab() {
  if (state.groupTabId) {
    try { await chrome.tabs.remove(state.groupTabId); } catch {}
  }
  state.groupTabId = null;
  state.groupId = null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // bridge.js -> background.js
  if (!message || typeof message !== "object" || !message.type) return false;

  // PING already handled in bridge.js, but double-handle here to be safe.
  if (message.type === "TIMEWARP_PING") {
    sendResponse({ type: "TIMEWARP_PONG", version: chrome.runtime.getManifest().version });
    return true;
  }

  if (message.type === "TIMEWARP_EMPLOYEE_START") {
    (async () => {
      state.employee = { id: message.employeeId, name: message.employeeName };
      if (message.useTabGroup) {
        await ensureGroupTab(message.employeeName);
      }
      sendResponse({ type: "TIMEWARP_GROUP_READY" });
    })();
    return true;
  }

  if (message.type === "TIMEWARP_EMPLOYEE_STOP") {
    (async () => {
      if (message.closeTabGroup) await closeGroupTab();
      state.employee = null;
      sendResponse({ type: "TIMEWARP_EMPLOYEE_STOPPED" });
    })();
    return true;
  }

  if (message.type === "TIMEWARP_GET_PAGE_CONTEXT") {
    (async () => {
      const tab = await getTargetTab(message.targetGroupTab);
      if (!tab) {
        sendResponse({ type: "TIMEWARP_PAGE_CONTEXT", payload: {} });
        return;
      }
      const result = await sendToTab(tab.id, { type: "TIMEWARP_GET_PAGE_CONTEXT" });
      if (result && result.payload) {
        sendResponse(result);
      } else {
        sendResponse({ type: "TIMEWARP_PAGE_CONTEXT", payload: { url: tab.url, title: tab.title, error: result?.error } });
      }
    })();
    return true;
  }

  if (message.type === "TIMEWARP_EXECUTE_ACTION") {
    (async () => {
      const action = message.action || {};
      // Navigation can be done at the tab level even before page-agent loads.
      if (action.action === "navigate" && action.url) {
        const tab = await getTargetTab(message.targetGroupTab);
        if (tab) {
          try {
            await chrome.tabs.update(tab.id, { url: action.url, active: !!message.focusGroup });
            sendResponse({ type: "TIMEWARP_ACTION_RESULT", payload: { success: true, action: "navigate" } });
            return;
          } catch (err) {
            sendResponse({ type: "TIMEWARP_ACTION_RESULT", payload: { success: false, action: "navigate", error: String((err && err.message) || err) } });
            return;
          }
        }
      }
      const tab = await getTargetTab(message.targetGroupTab);
      if (!tab) {
        sendResponse({ type: "TIMEWARP_ACTION_RESULT", payload: { success: false, action: action.action, error: "No active tab" } });
        return;
      }
      const result = await sendToTab(tab.id, { type: "TIMEWARP_EXECUTE_ACTION", action });
      if (result && result.payload) {
        sendResponse(result);
      } else {
        sendResponse({ type: "TIMEWARP_ACTION_RESULT", payload: { success: false, action: action.action, error: result?.error || "No response from page" } });
      }
    })();
    return true;
  }

  if (message.type === "TIMEWARP_OVERLAY_UPDATE") {
    // Overlay rendering is best-effort — store latest state for popup.
    chrome.storage.local.set({ timewarpOverlay: message }).catch(() => {});
    sendResponse({ type: "TIMEWARP_OVERLAY_ACK" });
    return true;
  }

  return false;
});
