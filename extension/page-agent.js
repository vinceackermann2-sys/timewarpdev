// page-agent.js — runs on every page so the background worker can ask
// the active tab for context (title, url, selected text, page text).

(function () {
  if (window.__TIMEWARP_PAGE_AGENT_LOADED__) return;
  window.__TIMEWARP_PAGE_AGENT_LOADED__ = true;

  function collectPageContext() {
    const sel = window.getSelection ? String(window.getSelection() || "") : "";
    const links = Array.from(document.querySelectorAll("a[href]"))
      .slice(0, 50)
      .map((a) => ({ text: (a.textContent || "").trim().slice(0, 120), href: a.href }));
    const formFields = Array.from(document.querySelectorAll("input, textarea, select"))
      .slice(0, 50)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || null,
        name: el.getAttribute("name") || null,
        id: el.id || null,
        placeholder: el.getAttribute("placeholder") || null,
      }));
    const pageText = (document.body && document.body.innerText) ? document.body.innerText.slice(0, 20000) : "";

    return {
      url: location.href,
      title: document.title,
      selectedText: sel,
      pageContent: pageText,
      formFields,
      links,
      metadata: {
        description: (document.querySelector('meta[name="description"]') || {}).content || null,
        ogTitle: (document.querySelector('meta[property="og:title"]') || {}).content || null,
      },
    };
  }

  function findElement(selector) {
    if (!selector) return null;
    try { return document.querySelector(selector); } catch { return null; }
  }

  function executeAction(action) {
    if (!action || !action.action) {
      return { success: false, action: "unknown", error: "Missing action" };
    }
    const name = action.action;
    try {
      switch (name) {
        case "navigate": {
          if (!action.url) return { success: false, action: name, error: "Missing url" };
          location.href = action.url;
          return { success: true, action: name };
        }
        case "click": {
          const el = findElement(action.selector);
          if (!el) return { success: false, action: name, error: "Element not found" };
          el.click();
          return { success: true, action: name };
        }
        case "type": {
          const el = findElement(action.selector);
          if (!el) return { success: false, action: name, error: "Element not found" };
          el.focus();
          if ("value" in el) {
            el.value = action.value || action.text || "";
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            el.textContent = action.value || action.text || "";
          }
          return { success: true, action: name };
        }
        case "scroll": {
          const dir = action.direction || "down";
          const amount = action.amount || window.innerHeight;
          window.scrollBy({ top: dir === "up" ? -amount : amount, behavior: "smooth" });
          return { success: true, action: name };
        }
        case "extract": {
          const el = action.selector ? findElement(action.selector) : document.body;
          if (!el) return { success: false, action: name, error: "Element not found" };
          return { success: true, action: name, data: { text: (el.textContent || "").trim().slice(0, 5000) } };
        }
        case "wait": {
          // Best-effort no-op; background handles real waits.
          return { success: true, action: name };
        }
        default:
          return { success: false, action: name, error: `Unsupported action: ${name}` };
      }
    } catch (err) {
      return { success: false, action: name, error: String((err && err.message) || err) };
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return false;
    if (message.type === "TIMEWARP_GET_PAGE_CONTEXT") {
      sendResponse({ type: "TIMEWARP_PAGE_CONTEXT", payload: collectPageContext() });
      return true;
    }
    if (message.type === "TIMEWARP_EXECUTE_ACTION") {
      const result = executeAction(message.action || {});
      sendResponse({ type: "TIMEWARP_ACTION_RESULT", payload: result });
      return true;
    }
    return false;
  });
})();
