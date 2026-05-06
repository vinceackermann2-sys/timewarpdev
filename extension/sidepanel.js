// TimeWarp – AI CEO · Side Panel v11

// ── Mode configuration ────────────────────────────────────────────────────────
const MODE_CFG = {
  research: {
    placeholder: "Ask anything...",
    emptyIcon: "🔍",
    emptyTitle: "Research",
    emptyDesc: "Navigate to a page or add URLs above, then ask me anything.",
  },
};

// ── Image error handler (replaces CSP-blocked onerror= attributes) ───────────
document.addEventListener("error", e => {
  if (e.target.tagName === "IMG") e.target.style.display = "none";
}, true);

// ── Theme system ─────────────────────────────────────────────────────────────
const THEME_KEY = "tw_theme";
const _themeMq  = window.matchMedia("(prefers-color-scheme: dark)");
let   _savedTheme = localStorage.getItem(THEME_KEY) || "light";

function applyTheme(t) {
  _savedTheme = t;
  localStorage.setItem(THEME_KEY, t);
  const resolved = t === "system" ? (_themeMq.matches ? "dark" : "light") : t;
  document.body.setAttribute("data-theme", resolved);
  document.querySelectorAll(".theme-opt").forEach(b =>
    b.classList.toggle("active", b.dataset.themeVal === t)
  );
}
_themeMq.addEventListener("change", () => { if (_savedTheme === "system") applyTheme("system"); });
document.querySelectorAll(".theme-opt").forEach(btn =>
  btn.addEventListener("click", () => applyTheme(btn.dataset.themeVal))
);
applyTheme(_savedTheme);


// Bind cm-card clicks (avoids inline onclick which MV3 CSP blocks)
document.querySelectorAll(".cm-card").forEach(card => {
  card.addEventListener("click", () => settingsCmClick(card));
});

let session = null;
let chatHistory = [];
let isLoading = false;
let pageContext = null;
let currentTabId = null;
let currentMode = "research";
let agentRunning = false;
let _overlayTabId = null;  // tab that currently has the overlay injected
let agentCard = null;
let controlMode = "full"; // "full" or "verify"
let _pendingGoal = null;  // goal waiting for control mode confirmation

// ── Screens ───────────────────────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(`${name}-screen`).classList.add("active");
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  session = await sendMsg({ type: "GET_SESSION" });
  if (session) onLoggedIn();
  else showScreen("auth");
}

function onLoggedIn() {
  showScreen("chat");
  refreshPageContext();
  listenForBackground();
  setMode("research");
  // Load saved control mode preference
  const saved = localStorage.getItem("tw_control_mode");
  if (saved === "full" || saved === "verify") controlMode = saved;
  updateControlModeBadge();
  // Seed the research panel with whatever tab is active right now
}



function setMode(mode) {
  currentMode = "research"; // only research mode exists
  const cfg = MODE_CFG.research;

  document.body.classList.add("mode-research");

  const chatInput = document.getElementById("chat-input");
  if (chatInput) chatInput.placeholder = cfg.placeholder;

  const emptyIcon  = document.getElementById("empty-icon");
  const emptyTitle = document.getElementById("empty-title");
  const emptyDesc  = document.getElementById("empty-desc");
  if (emptyIcon)  emptyIcon.textContent  = cfg.emptyIcon;
  if (emptyTitle) emptyTitle.textContent = cfg.emptyTitle;
  if (emptyDesc)  emptyDesc.textContent  = cfg.emptyDesc;

  if (researchUrls.length === 0) refreshPageContext();
}



// mode-icon-btn is telescope indicator only — no popup needed (research is the only mode)



// ── Background message listener ───────────────────────────────────────────────
function listenForBackground() {
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "TAB_CHANGED") updateTabStrip(msg.url, msg.tabId);
    if (msg.type === "AGENT_STEP") handleAgentStep(msg);
    if (msg.type === "AGENT_STEP_DONE") handleAgentStepDone(msg);
    if (msg.type === "AGENT_TAB_CREATED") {
      // Show a note that agent opened a tab
      const statusEl = agentCard?.querySelector(".agent-status-text");
      if (statusEl) statusEl.textContent = "🌐 Opened working tab…";
    }
    if (msg.type === "AGENT_PAUSE_ASK")    handleAgentPause(msg);
    if (msg.type === "AGENT_TAB_CREATED")  handleAgentTabCreated(msg);
    if (msg.type === "AGENT_VERIFY_ACTION") handleVerifyAction(msg);
    if (msg.type === "AGENT_MANUAL_TAKEOVER") handleManualTakeover(msg);
  });
}

// ── Tab strip ─────────────────────────────────────────────────────────────────
function updateTabStrip(url, tabId) {
  if (!url) return;
  currentTabId = tabId;
  const dot = document.getElementById("page-dot");
  const urlEl = document.getElementById("context-url");
  const fav = document.getElementById("tab-favicon");
  try {
    const u = new URL(url);
    if (fav) { fav.style.display = ""; fav.src = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=16`; }
    urlEl.textContent = u.hostname + (u.pathname !== "/" ? u.pathname.slice(0, 26) : "");
  } catch { urlEl.textContent = url.slice(0, 50); }
  dot.className = "page-dot";
  sendMsg({ type: "GET_PAGE_CONTEXT", tabId }).then(r => { if (r?.context) pageContext = r.context; });
}

async function refreshPageContext() {
  const r = await sendMsg({ type: "GET_PAGE_CONTEXT", tabId: currentTabId });
  const dot = document.getElementById("page-dot");
  const urlEl = document.getElementById("context-url");
  const fav = document.getElementById("tab-favicon");
  if (r?.url) {
    currentTabId = r.tabId;
    pageContext = r.context;
    try {
      const u = new URL(r.url);
      if (fav) { fav.style.display = ""; fav.src = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=16`; }
      urlEl.textContent = u.hostname + (u.pathname !== "/" ? u.pathname.slice(0, 26) : "");
    } catch { urlEl.textContent = r.url.slice(0, 50); }
    dot.className = "page-dot";
  } else {
    urlEl.textContent = "No active tab";
    dot.className = "page-dot offline";
    pageContext = null; currentTabId = null;
  }
}

// ── Tab overlay (injected into the working tab) ──────────────────────────────
function handleAgentTabCreated(msg) {
  const statusEl = agentCard?.querySelector(".agent-status-text");
  if (statusEl) statusEl.textContent = "🌐 Opened working tab…";
  if (!msg.tabId) return;
  // Remove old overlay from previous tab if agent followed a new tab
  if (_overlayTabId && _overlayTabId !== msg.tabId) {
    chrome.scripting.executeScript({
      target: { tabId: _overlayTabId },
      func: () => { document.getElementById("__tw_overlay__")?.remove(); }
    }).catch(() => {});
  }
  _overlayTabId = msg.tabId;
  injectTabOverlay(msg.tabId);
}

async function injectTabOverlay(tabId) {
  // Wait a moment for the tab DOM to be ready, then inject
  await new Promise(r => setTimeout(r, 1200));
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Prevent double-injection
        if (document.getElementById("__tw_overlay__")) return;
        const overlay = document.createElement("div");
        overlay.id = "__tw_overlay__";
        // Inject keyframes for shimmer + pulse animations
        const styleTag = document.createElement("style");
        styleTag.textContent = `
          @keyframes __tw_shimmer__ {
            0%   { transform: translateX(-100%) skewX(-12deg); }
            100% { transform: translateX(250%) skewX(-12deg); }
          }
          @keyframes __tw_pulse_dot__ {
            0%,100% { opacity:1; transform:scale(1); }
            50%      { opacity:0.4; transform:scale(0.7); }
          }
          #__tw_overlay__ {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2147483647;
            width: min(680px, calc(100vw - 40px));
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
            /* Liquid glass base */
            background: linear-gradient(
              135deg,
              rgba(255,255,255,0.18) 0%,
              rgba(255,255,255,0.07) 40%,
              rgba(180,180,255,0.10) 70%,
              rgba(255,255,255,0.13) 100%
            );
            backdrop-filter: blur(40px) saturate(2.2) brightness(1.15);
            -webkit-backdrop-filter: blur(40px) saturate(2.2) brightness(1.15);
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.30);
            border-top: 1px solid rgba(255,255,255,0.50);
            box-shadow:
              0 32px 64px rgba(0,0,0,0.40),
              0 8px 24px rgba(0,0,0,0.25),
              0 2px 4px rgba(0,0,0,0.15),
              inset 0 1px 0 rgba(255,255,255,0.55),
              inset 0 -1px 0 rgba(255,255,255,0.08),
              inset 1px 0 0 rgba(255,255,255,0.15),
              inset -1px 0 0 rgba(255,255,255,0.15);
            padding: 0;
            overflow: hidden;
          }
          #__tw_overlay__::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 24px;
            background: linear-gradient(
              105deg,
              transparent 30%,
              rgba(255,255,255,0.08) 50%,
              transparent 70%
            );
            pointer-events: none;
          }
          #__tw_overlay__::after {
            content: '';
            position: absolute;
            top: 0; left: -60%;
            width: 40%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
            animation: __tw_shimmer__ 4s ease-in-out infinite;
            pointer-events: none;
          }
          .__tw_btn__ {
            position: relative;
            overflow: hidden;
            border-radius: 12px;
            font-size: 12.5px;
            font-weight: 700;
            cursor: pointer;
            padding: 9px 20px;
            transition: all 0.15s ease;
            letter-spacing: 0.3px;
            white-space: nowrap;
            /* Solid, opaque base — always visible regardless of page background */
            background: rgba(60, 60, 80, 0.92);
            border: 1.5px solid rgba(255,255,255,0.22);
            color: #ffffff;
            box-shadow:
              0 2px 8px rgba(0,0,0,0.40),
              0 1px 2px rgba(0,0,0,0.25),
              inset 0 1px 0 rgba(255,255,255,0.18);
            text-shadow: 0 1px 2px rgba(0,0,0,0.50);
          }
          .__tw_btn__:hover {
            background: rgba(90, 90, 115, 0.98);
            border-color: rgba(255,255,255,0.38);
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22);
          }
          .__tw_btn__:active { transform: translateY(0); box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
          .__tw_btn_pause__ {
            background: rgba(245, 158, 11, 0.90);
            border-color: rgba(255,200,80,0.55);
            color: #fff;
            box-shadow: 0 2px 10px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,230,140,0.30);
          }
          .__tw_btn_pause__:hover {
            background: rgba(245, 158, 11, 1);
            box-shadow: 0 4px 16px rgba(245,158,11,0.55);
          }
          .__tw_btn_stop__ {
            background: rgba(220, 38, 38, 0.90);
            border-color: rgba(255,120,120,0.50);
            color: #fff;
            box-shadow: 0 2px 10px rgba(220,38,38,0.45), inset 0 1px 0 rgba(255,180,180,0.25);
          }
          .__tw_btn_stop__:hover {
            background: rgba(220, 38, 38, 1);
            box-shadow: 0 4px 16px rgba(220,38,38,0.55);
          }
          .__tw_btn_continue__ {
            background: rgba(34, 197, 94, 0.90);
            border-color: rgba(100,255,150,0.45);
            color: #fff;
            box-shadow: 0 2px 10px rgba(34,197,94,0.45), inset 0 1px 0 rgba(160,255,200,0.25);
          }
          .__tw_btn_continue__:hover {
            background: rgba(34, 197, 94, 1);
            box-shadow: 0 4px 16px rgba(34,197,94,0.55);
          }
          #__tw_pulse_dot__ {
            width: 7px; height: 7px; border-radius: 50%;
            background: #a78bfa;
            box-shadow: 0 0 6px rgba(167,139,250,0.8);
            animation: __tw_pulse_dot__ 1.6s ease-in-out infinite;
            flex-shrink: 0;
          }
        `;
        document.head.appendChild(styleTag);

        overlay.innerHTML = `
          <div style="display:flex;align-items:center;gap:14px;padding:14px 20px 14px 20px;">
            <!-- Brand mark -->
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
              <div style="
                width:30px;height:30px;border-radius:10px;
                background:linear-gradient(135deg,rgba(167,139,250,0.7),rgba(99,102,241,0.6));
                border:1px solid rgba(255,255,255,0.30);
                display:flex;align-items:center;justify-content:center;
                box-shadow:0 2px 8px rgba(99,102,241,0.40),inset 0 1px 0 rgba(255,255,255,0.35);
                font-size:14px;
              ">⏱</div>
              <div style="line-height:1;">
                <div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.9);letter-spacing:0.8px;text-transform:uppercase;">TimeWarp</div>
                <div style="font-size:9px;color:rgba(255,255,255,0.45);letter-spacing:0.3px;margin-top:1px;">AI Agent</div>
              </div>
            </div>

            <!-- Divider -->
            <div style="width:1px;height:28px;background:rgba(255,255,255,0.15);flex-shrink:0;"></div>

            <!-- Status -->
            <div style="display:flex;align-items:center;gap:7px;flex:1;min-width:0;">
              <div id="__tw_pulse_dot__"></div>
              <div id="__tw_status__" style="font-size:12px;color:rgba(255,255,255,0.75);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Running task…</div>
            </div>

            <!-- Actions -->
            <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
              <button id="__tw_pause__"    class="__tw_btn__ __tw_btn_pause__">⏸ Pause</button>
              <button id="__tw_continue__" class="__tw_btn__ __tw_btn_continue__">▶ Continue</button>
              <button id="__tw_stop__"     class="__tw_btn__ __tw_btn_stop__">■ Stop</button>
            </div>
          </div>

          <!-- Progress bar -->
          <div style="height:2px;background:rgba(255,255,255,0.06);position:relative;overflow:hidden;">
            <div id="__tw_progress__" style="
              height:100%;width:0%;
              background:linear-gradient(90deg,rgba(167,139,250,0.9),rgba(99,102,241,0.7),rgba(59,171,255,0.8));
              transition:width 0.6s cubic-bezier(0.4,0,0.2,1);
              box-shadow:0 0 8px rgba(167,139,250,0.6);
            "></div>
          </div>
        `;
        document.documentElement.appendChild(overlay);

        let paused = false;
        const statusEl   = overlay.querySelector("#__tw_status__");
        const pulseDot   = overlay.querySelector("#__tw_pulse_dot__");
        const pauseBtn   = overlay.querySelector("#__tw_pause__");
        const continueBtn= overlay.querySelector("#__tw_continue__");
        const stopBtn    = overlay.querySelector("#__tw_stop__");
        const progressEl = overlay.querySelector("#__tw_progress__");
        let stepCount = 0;

        // Continue starts dimmed — agent is running, nothing to resume yet
        continueBtn.style.opacity = "0.4";
        continueBtn.style.pointerEvents = "none";
        pauseBtn.style.opacity = "1";

        pauseBtn.addEventListener("click", () => {
          paused = true;
          pauseBtn.style.opacity = "0.4"; pauseBtn.style.pointerEvents = "none";
          continueBtn.style.opacity = "1"; continueBtn.style.pointerEvents = "";
          statusEl.textContent = "Paused — press Continue to resume";
          statusEl.style.color = "#fbbf24";
          if (pulseDot) { pulseDot.style.background="#fbbf24"; pulseDot.style.boxShadow="0 0 6px rgba(251,191,36,0.8)"; pulseDot.style.animationPlayState="paused"; }
          window.postMessage({ __tw__: true, action: "PAUSE" }, "*");
        });
        continueBtn.addEventListener("click", () => {
          paused = false;
          continueBtn.style.opacity = "0.4"; continueBtn.style.pointerEvents = "none";
          pauseBtn.style.opacity = "1"; pauseBtn.style.pointerEvents = "";
          statusEl.textContent = "Running task…";
          statusEl.style.color = "rgba(255,255,255,0.75)";
          if (pulseDot) { pulseDot.style.background="#a78bfa"; pulseDot.style.boxShadow="0 0 6px rgba(167,139,250,0.8)"; pulseDot.style.animationPlayState="running"; }
          window.postMessage({ __tw__: true, action: "CONTINUE" }, "*");
        });
        stopBtn.addEventListener("click", () => {
          statusEl.textContent = "Stopping…";
          statusEl.style.color = "#f87171";
          if (pulseDot) { pulseDot.style.background="#f87171"; pulseDot.style.boxShadow="0 0 6px rgba(248,113,113,0.8)"; }
          pauseBtn.style.opacity = "0.4"; pauseBtn.style.pointerEvents = "none";
          continueBtn.style.opacity = "0.4"; continueBtn.style.pointerEvents = "none";
          window.postMessage({ __tw__: true, action: "STOP" }, "*");
        });

        // Listen for status updates pushed from the extension
        window.addEventListener("message", e => {
          if (e.data?.__tw_update__) {
            statusEl.textContent = e.data.label || "Running…";
            statusEl.style.color = "rgba(255,255,255,0.75)";
            // Advance progress bar
            stepCount = Math.min(stepCount + 1, 38);
            if (progressEl) progressEl.style.width = Math.round((stepCount / 40) * 100) + "%";
          }
          if (e.data?.__tw_done__) {
            const ok = e.data.ok;
            statusEl.textContent = ok ? "✅ Task complete" : "❌ " + (e.data.label || "Stopped");
            statusEl.style.color = ok ? "#4ade80" : "#f87171";
            if (pulseDot) { pulseDot.style.background = ok ? "#4ade80" : "#f87171"; pulseDot.style.boxShadow = `0 0 6px ${ok?"rgba(74,222,128,0.8)":"rgba(248,113,113,0.8)"}`; pulseDot.style.animation="none"; }
            if (progressEl) progressEl.style.width = ok ? "100%" : progressEl.style.width;
            pauseBtn.style.display = "none"; continueBtn.style.display = "none"; stopBtn.style.display = "none";
            setTimeout(() => { overlay.style.opacity="0"; overlay.style.transform="translateX(-50%) translateY(16px)"; overlay.style.transition="opacity 0.5s,transform 0.5s"; setTimeout(()=>overlay.remove(),500); }, 3500);
          }
        });
      }
    });

    // Relay postMessage events from page → background
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.addEventListener("message", e => {
          if (!e.data?.__tw__) return;
          chrome.runtime.sendMessage({ type: e.data.action === "STOP" ? "STOP_AGENT" : e.data.action === "PAUSE" ? "PAUSE_OVERLAY" : "CONTINUE_OVERLAY" });
        });
      }
    });
  } catch(err) {
    console.warn("[TW overlay] inject failed:", err.message);
  }
}

// Update overlay status label in the working tab
async function updateOverlayStatus(tabId, label, done = false, ok = true) {
  if (!tabId) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (label, done, ok) => {
        if (done) window.postMessage({ __tw_done__: true, label, ok }, "*");
        else       window.postMessage({ __tw_update__: true, label }, "*");
      },
      args: [label, done, ok]
    });
  } catch(_) {}
}

// ── Agent live card ───────────────────────────────────────────────────────────
function handleAgentStep(msg) {
  if (!agentCard) return;
  const statusEl = agentCard.querySelector(".agent-status-text");
  const barEl = agentCard.querySelector(".agent-progress-bar");
  const listEl = agentCard.querySelector(".agent-step-list");

  if (statusEl) statusEl.textContent = msg.label || "Working…";
  if (barEl && msg.total && msg.step > 0) barEl.style.width = `${Math.min(Math.round((msg.step / msg.total) * 100), 99)}%`;

  if (msg.status === "executing" && listEl) {
    const row = document.createElement("div");
    row.className = "agent-step-row running";
    row.id = `astep-${msg.step}`;
    row.innerHTML = `<div class="astep-spinner"></div><div class="astep-label">${escHtml(msg.label)}</div>`;
    listEl.appendChild(row);
    scrollBottom();
  }

  if (["done", "failed", "stopped", "paused"].includes(msg.status)) {
    const actEl = agentCard.querySelector(".agent-card-actions");
    if (actEl && msg.status !== "paused") actEl.innerHTML = "";
    if (statusEl) {
      statusEl.textContent = msg.label;
      statusEl.className = `agent-status-text ${msg.status === "done" ? "status-done" : msg.status === "paused" ? "status-paused" : "status-failed"}`;
    }
    if (barEl && msg.status === "done") barEl.style.width = "100%";
    if (msg.status !== "paused") {
      agentRunning = false;
      setLoading(false);
      updateSendBtn();
    }
  }
}

// ── Manual takeover handler (login / payment safety) ─────────────────────────
function handleManualTakeover(msg) {
  if (!agentCard) return;
  const statusEl = agentCard.querySelector(".agent-status-text");
  if (statusEl) {
    statusEl.textContent = msg.reason || "🔒 Manual step required";
    statusEl.className = "agent-status-text status-paused";
  }
  const actEl = agentCard.querySelector(".agent-card-actions");
  if (actEl) {
    actEl.innerHTML = `
      <div class="takeover-banner">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Complete this step manually in the browser tab, then press Continue.
      </div>
      <button class="agent-continue-btn" id="takeover-continue-btn">▶ Continue</button>
      <button class="agent-stop-btn" id="takeover-stop-btn">■ Stop</button>
    `;
    document.getElementById("takeover-continue-btn").addEventListener("click", () => {
      actEl.innerHTML = "";
      if (statusEl) { statusEl.textContent = "▶️ Resuming…"; statusEl.className = "agent-status-text"; }
      sendMsg({ type: "CONTINUE_OVERLAY" });
    });
    document.getElementById("takeover-stop-btn").addEventListener("click", () => {
      actEl.innerHTML = "";
      sendMsg({ type: "STOP_AGENT" });
      agentRunning = false; setLoading(false); updateSendBtn();
    });
  }
  scrollBottom();
}

function handleAgentPause(msg) {
  if (!agentCard) return;
  const statusEl = agentCard.querySelector(".agent-status-text");
  if (statusEl) {
    statusEl.textContent = msg.label || `⏸ Paused at step ${msg.step}. Continue?`;
    statusEl.className = "agent-status-text status-paused";
  }
  const actEl = agentCard.querySelector(".agent-card-actions");
  if (actEl) {
    actEl.innerHTML = `
      <button class="agent-continue-btn" id="agent-continue-btn">▶ Continue</button>
      <button class="agent-stop-btn" id="agent-pause-stop-btn">■ Stop</button>
    `;
    document.getElementById("agent-continue-btn").addEventListener("click", () => {
      actEl.innerHTML = '';
      if (statusEl) { statusEl.textContent = "▶️ Resuming…"; statusEl.className = "agent-status-text"; }
      sendMsg({ type: "CONTINUE_AGENT" });
    });
    document.getElementById("agent-pause-stop-btn").addEventListener("click", () => {
      actEl.innerHTML = '';
      sendMsg({ type: "STOP_AGENT" });
      agentRunning = false;
      setLoading(false);
      updateSendBtn();
    });
  }
  scrollBottom();
}

function handleAgentStepDone(msg) {
  if (!agentCard) return;
  const row = agentCard.querySelector(`#astep-${msg.step}`);
  if (!row) return;
  row.classList.remove("running");
  row.classList.add(msg.success ? "done" : "failed");
  row.querySelector(".astep-spinner")?.remove();
  const icon = document.createElement("div");
  icon.className = "astep-icon";
  icon.textContent = msg.success ? "✓" : "✗";
  row.prepend(icon);
  if (msg.detail) {
    const d = document.createElement("div");
    d.className = "astep-detail";
    d.textContent = msg.detail.slice(0, 60);
    row.appendChild(d);
  }
  scrollBottom();
}

// ── Verify action handler ─────────────────────────────────────────────────────
function handleVerifyAction(msg) {
  if (!agentCard) return;
  // Remove any previous verify card
  agentCard.querySelector(".verify-card")?.remove();

  const card = document.createElement("div");
  card.className = "verify-card";
  card.innerHTML = `
    <div class="verify-header">
      <span class="verify-badge">Awaiting approval</span>
      <span class="verify-action-label">${escHtml(msg.label)}</span>
    </div>
    <div class="verify-btns">
      <button class="verify-approve-btn">✓ Approve</button>
      <button class="verify-reject-btn">✗ Stop</button>
    </div>`;

  card.querySelector(".verify-approve-btn").addEventListener("click", () => {
    card.remove();
    sendMsg({ type: "APPROVE_ACTION", approved: true });
  });
  card.querySelector(".verify-reject-btn").addEventListener("click", () => {
    card.remove();
    sendMsg({ type: "APPROVE_ACTION", approved: false });
    agentRunning = false;
    setLoading(false);
    updateSendBtn();
  });

  agentCard.appendChild(card);
  scrollBottom();
}

// ── Control mode badge ────────────────────────────────────────────────────────
function updateControlModeBadge() {
  document.querySelectorAll(".cm-badge").forEach(b => b.remove());
  syncSettingsCmCards();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
document.getElementById("login-btn").addEventListener("click", doLogin);
document.getElementById("auth-email").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("auth-password").focus(); });
document.getElementById("auth-password").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });

async function doLogin() {
  const email = document.getElementById("auth-email").value.trim();
  const pass = document.getElementById("auth-password").value;
  const err = document.getElementById("auth-error");
  const btn = document.getElementById("login-btn");
  if (!email || !pass) { err.textContent = "Please enter your email and password."; return; }
  btn.disabled = true; btn.textContent = "Signing in…"; err.textContent = "";
  const r = await sendMsg({ type: "LOGIN", email, password: pass });
  btn.disabled = false; btn.textContent = "Sign In to TimeWarp";
  if (r?.success) { session = r.session; onLoggedIn(); }
  else err.textContent = r?.error || "Login failed.";
}



// ── Control mode popup ───────────────────────────────────────────────────────
const cmBackdrop = document.getElementById("cm-backdrop");

// Option selection
document.querySelectorAll(".cm-option").forEach(opt => {
  opt.addEventListener("click", () => {
    document.querySelectorAll(".cm-option").forEach(o => o.classList.remove("selected"));
    opt.classList.add("selected");
  });
});

document.getElementById("cm-confirm-btn").addEventListener("click", () => {
  const selected = document.querySelector(".cm-option.selected");
  const mode = selected?.dataset.mode || "full";
  controlMode = mode;
  localStorage.setItem("tw_control_mode", mode);
  cmBackdrop.classList.remove("open");
  syncSettingsCmCards();
  // Run the pending task (unless it was opened from settings)
  if (_pendingGoal && _pendingGoal !== "__settings__") {
    const goal = _pendingGoal;
    _pendingGoal = null;
    _runAgentTask(goal);
  }
  _pendingGoal = null;
});

// Close on backdrop click (settings mode only; task mode requires explicit choice)
cmBackdrop.addEventListener("click", e => {
  if (e.target === cmBackdrop && _pendingGoal === "__settings__") {
    cmBackdrop.classList.remove("open");
    _pendingGoal = null;
  }
});

function showControlModePopup(goal) {
  _pendingGoal = goal;
  // Pre-select saved preference
  document.querySelectorAll(".cm-option").forEach(o => o.classList.remove("selected"));
  const toSelect = document.getElementById(controlMode === "verify" ? "cm-opt-verify" : "cm-opt-full");
  toSelect?.classList.add("selected");
  cmBackdrop.classList.add("open");
}

// ── Chat history persistence ──────────────────────────────────────────────────
const HISTORY_KEY = "tw_chat_sessions";
const MAX_SESSIONS = 20;
let _currentSessionId = null; // track current session so we update-in-place

function _autoSaveSession() {
  if (!chatHistory.length) return;
  const sessions = getSessions();
  const first = chatHistory.find(m => m.role === "user");
  const title = first ? first.content.slice(0, 55) : "Conversation";
  const ts_ = new Date().toLocaleDateString();

  if (_currentSessionId) {
    // Update existing session
    const idx = sessions.findIndex(s => s.id === _currentSessionId);
    if (idx !== -1) {
      sessions[idx].messages = [...chatHistory];
      sessions[idx].ts = ts_;
      // Don't overwrite a user-renamed title
      if (!sessions[idx]._renamed) sessions[idx].title = title;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
      return;
    }
  }
  // New session
  _currentSessionId = Date.now();
  sessions.unshift({ id: _currentSessionId, title, ts: ts_, messages: [...chatHistory], _renamed: false });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

function saveSession() {
  _autoSaveSession();
}

function getSessions() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

function _saveSessions(sessions) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

function renderHistoryPanel() {
  const list = document.getElementById("history-list");
  const sessions = getSessions();
  if (!sessions.length) {
    list.innerHTML = '<div class="history-empty">No saved conversations yet.<br>Your chats will appear here.</div>';
    return;
  }
  list.innerHTML = sessions.map((s, i) => `
    <div class="history-item" data-idx="${i}" data-id="${s.id}">
      <div class="history-item-title">${escHtml(s.title)}</div>
      <div class="history-item-meta">${s.ts} · ${s.messages.length} messages</div>
      <button class="history-rename-btn" data-idx="${i}" title="Rename">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
    </div>
  `).join("");

  // Load session on click
  list.querySelectorAll(".history-item").forEach(el => {
    el.addEventListener("click", e => {
      if (e.target.closest(".history-rename-btn")) return; // handled below
      const s = getSessions()[+el.dataset.idx];
      if (!s) return;
      chatHistory = [...s.messages];
      _currentSessionId = s.id;
      resetMessages();
      chatHistory.forEach(m => {
        if (m.role === "user") appendUserMsg(m.content);
        else appendMsg(m.content, []);
      });
      closeHistoryPanel();
    });
  });

  // Rename on pencil click
  list.querySelectorAll(".history-rename-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = +btn.dataset.idx;
      const itemEl = btn.closest(".history-item");
      const titleEl = itemEl.querySelector(".history-item-title");
      const sessions = getSessions();
      const currentTitle = sessions[idx]?.title || "";
      // Replace title with inline input
      titleEl.innerHTML = `<input class="history-rename-input" value="${escAttr(currentTitle)}" maxlength="60">`;
      const input = titleEl.querySelector(".history-rename-input");
      input.focus(); input.select();
      const commit = () => {
        const newTitle = input.value.trim() || currentTitle;
        sessions[idx].title = newTitle;
        sessions[idx]._renamed = true;
        _saveSessions(sessions);
        renderHistoryPanel();
      };
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", e2 => {
        if (e2.key === "Enter") { e2.preventDefault(); input.blur(); }
        if (e2.key === "Escape") { renderHistoryPanel(); }
      });
    });
  });
}

function openHistoryPanel() {
  renderHistoryPanel();
  document.getElementById("history-panel").classList.add("open");
}
function closeHistoryPanel() {
  document.getElementById("history-panel").classList.remove("open");
}

document.getElementById("history-btn").addEventListener("click", () => {
  const panel = document.getElementById("history-panel");
  panel.classList.contains("open") ? closeHistoryPanel() : openHistoryPanel();
});
document.getElementById("history-close-btn").addEventListener("click", closeHistoryPanel);

// ── Nav ───────────────────────────────────────────────────────────────────────
document.getElementById("clear-btn").addEventListener("click", () => {
  if (agentRunning) return;
  saveSession();
  chatHistory = [];
  agentCard = null;
  _currentSessionId = null;
  resetMessages();
});

// ── Input ─────────────────────────────────────────────────────────────────────
document.getElementById("send-btn").addEventListener("click", handleSendOrStop);
document.getElementById("chat-input").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendOrStop(); }
});
// Stop animation immediately on focus (click or tab into input)
document.getElementById("chat-input").addEventListener("focus", function () {});
document.getElementById("chat-input").addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 120) + "px";
});

// Click anywhere in the input row focuses the textarea
document.querySelector(".input-row-container").addEventListener("click", function(e) {
  if (!e.target.closest(".input-icon-btn") && e.target !== document.getElementById("send-btn")) {
    document.getElementById("chat-input").focus();
  }
});

let isChatLoading = false;  // true while a CHAT request is in flight

function handleSendOrStop() {
  if (agentRunning) {
    sendMsg({ type: "STOP_AGENT" });
    agentRunning = false;
    setLoading(false);
    updateSendBtn();
    if (agentCard) {
      const s = agentCard.querySelector(".agent-status-text");
      if (s) { s.textContent = "⏹ Stopped"; s.className = "agent-status-text status-failed"; }
    }
  } else if (isChatLoading) {
    // Stop in-flight chat request
    sendMsg({ type: "STOP_CHAT" });
    isChatLoading = false;
    removeTyping("typing-main");
    setLoading(false);
    updateSendBtn();
  } else {
    sendMessage();
  }
}

function updateSendBtn() {
  const btn = document.getElementById("send-btn");
  const input = document.getElementById("chat-input");
  const arrowSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
  const stopSvg  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
  if (agentRunning || isChatLoading) {
    btn.innerHTML = stopSvg; btn.title = agentRunning ? "Stop agent" : "Stop";
    btn.style.background = "var(--error)";
    input.disabled = agentRunning; // keep input enabled during chat so user can type next msg
    if (agentRunning) input.placeholder = "Agent is working…";
  } else {
    btn.innerHTML = arrowSvg; btn.title = "Send";
    btn.style.background = "";
    input.disabled = false;
    input.placeholder = "Ask anything...";
  }
}

// ── Send ──────────────────────────────────────────────────────────────────────
async function sendMessage() {
  if (isLoading || agentRunning || isChatLoading) return;
  const input = document.getElementById("chat-input");
  const raw = input.value.trim();
  if (!raw) return;

  const text = raw;

  document.getElementById("empty-state")?.remove();
  input.value = ""; input.style.height = "auto"; input.blur();

  await refreshPageContext();

  chatHistory.push({ role: "user", content: text });
  appendUserMsg(text);

  {
    // Research mode — also picks up any inline URL in the message
    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    const inlineUrl = urlMatch ? urlMatch[0] : null;

    const contextUrls = [];
    if (inlineUrl) contextUrls.push(inlineUrl);

    setLoading(true);
    isChatLoading = true;
    updateSendBtn();
    showTyping("typing-main");
    const res = await sendMsg({
      type: "CHAT",
      messages: chatHistory,
      tabId: currentTabId,
      scrapeUrl: inlineUrl || null,
      researchUrls: contextUrls,
    });
    removeTyping("typing-main");
    isChatLoading = false;
    setLoading(false);
    updateSendBtn();

    if (!res || res.sessionExpired) {
      session = null; chatHistory = []; resetMessages(); showScreen("auth");
      document.getElementById("auth-error").textContent = "Session expired.";
      return;
    }
    if (res.error === "__stopped__") { chatHistory.pop(); return; } // silently cancelled
    if (res.error) { appendMsg(`⚠️ ${res.error}`); return; }
    chatHistory.push({ role: "assistant", content: res.reply });
    appendMsg(res.reply, res.suggestions || []);
  }
}

// ── Agent task ────────────────────────────────────────────────────────────────
async function doAgentTask(goal) {
  // Show control mode popup before the very first task each session
  const hasChosenMode = localStorage.getItem("tw_control_mode");
  if (!hasChosenMode) {
    showControlModePopup(goal);
    return; // will be called again by cm-confirm-btn handler
  }
  _runAgentTask(goal);
}

async function _runAgentTask(goal) {
  agentRunning = true;
  updateSendBtn();

  agentCard = createAgentCard(goal);
  document.getElementById("messages").appendChild(agentCard);
  agentCard.querySelector("#agent-inline-stop-btn")?.addEventListener("click", handleSendOrStop);
  scrollBottom();


  const res = await sendMsg({
    type: "RUN_AGENT_TASK",
    goal,
    tabId: currentTabId,
    pageContext: pageContext,
    messages: chatHistory.slice(-6),
    verifyMode: controlMode === "verify",
    contextUrls: researchUrls.map(e => e.url).filter(Boolean),
  });

  agentRunning = false;
  updateSendBtn();

  if (!res) { finaliseCard(agentCard, false, "No response from agent.", []); return; }

  const reply = res.reply || (res.ok ? "Task completed." : "Could not complete task.");
  chatHistory.push({ role: "assistant", content: reply });

  if (reply && reply.length > 3) appendMsg(reply, []);
  finaliseCard(agentCard, res.ok, reply, res.stepLog || []);
  agentCard = null;
  setTimeout(refreshPageContext, 800);
}

function createAgentCard(goal) {
  const card = document.createElement("div");
  card.className = "agent-card";
  const badge = controlMode === "verify"
    ? `<span class="cm-badge verify">👁️ Verify</span>`
    : `<span class="cm-badge full">🤖 Auto</span>`;
  card.innerHTML = `
    <div class="agent-card-header">
      <div class="agent-card-icon">🤖</div>
      <div class="agent-card-meta">
        <div class="agent-card-title">Running task ${badge}</div>
        <div class="agent-card-goal">${escHtml(goal.slice(0, 80))}</div>
      </div>
      <div class="agent-card-actions">
        <button class="agent-stop-btn" id="agent-inline-stop-btn">■ Stop</button>
      </div>
    </div>
    <div class="agent-progress-track"><div class="agent-progress-bar" style="width:0%"></div></div>
    <div class="agent-status-text">Starting…</div>
    <div class="agent-step-list"></div>`;
  return card;
}

function finaliseCard(card, ok, reply, stepLog) {
  if (!card) return;
  card.querySelector(".agent-card-actions")?.replaceChildren();
  const bar = card.querySelector(".agent-progress-bar");
  if (bar && ok) bar.style.width = "100%";
  const s = card.querySelector(".agent-status-text");
  if (s && !s.classList.contains("status-done") && !s.classList.contains("status-failed")) {
    s.textContent = ok ? "✅ Complete" : "❌ " + reply.slice(0, 60);
    s.className = `agent-status-text ${ok ? "status-done" : "status-failed"}`;
  }
  if (stepLog?.length) {
    const done = stepLog.filter(x => x.success).length, fail = stepLog.length - done;
    const el = document.createElement("div");
    el.className = `agent-summary ${fail === 0 ? "summary-ok" : "summary-warn"}`;
    el.textContent = fail === 0 ? `✅ ${done} steps completed` : `⚠️ ${done} ok · ${fail} failed`;
    card.appendChild(el);
  }
}

// ── Message helpers ───────────────────────────────────────────────────────────
function appendUserMsg(text) {
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "msg user";
  div.innerHTML = `<div class="msg-bubble">${escHtml(text)}</div><div class="msg-time">${ts()}</div>`;
  msgs.appendChild(div); scrollBottom();
}

function appendMsg(text, suggestions, role, id) {
  if (id) {
    // Used by showTyping — just create the container and return it
    const msgs = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = `msg ${role || "assistant"}`; div.id = id;
    msgs.appendChild(div); scrollBottom();
    return div;
  }
  if (!text?.trim()) return;
  text = stripJson(text);
  if (!text.trim()) return;
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "msg assistant";

  // Render suggestions card if provided
  const suggestHtml = suggestions && suggestions.length
    ? `<div class="suggest-card">
        <div class="suggest-card-label">Suggested</div>
        ${suggestions.map(s => `<span class="suggest-q" data-msg="${escAttr(s)}">↳ ${escHtml(s)}</span>`).join("")}
      </div>`
    : "";

  div.innerHTML = `<div class="msg-bubble">${md(text)}${suggestHtml}</div><div class="msg-time">${ts()}</div>`;

  // Wire up suggestion clicks
  div.querySelectorAll(".suggest-q").forEach(el => {
    el.addEventListener("click", () => {
      const input = document.getElementById("chat-input");
      input.value = el.dataset.msg;
      input.focus();
      handleSendOrStop();
    });
  });

  msgs.appendChild(div); scrollBottom();

  // Auto-save session after every AI reply (overwrites last save for same session)
  _autoSaveSession();
}

const _typingPhrases = ["Thinking…", "Reading page…", "Analysing…", "Searching context…", "Composing response…"];
function showTyping(id) {
  const msgs = document.getElementById("messages");
  const div = document.createElement("div"); div.className = "msg assistant"; div.id = id;
  let phraseIdx = 0;
  div.innerHTML = `<div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div><span class="typing-text" id="${id}-text">${_typingPhrases[0]}</span></div></div>`;
  msgs.appendChild(div); scrollBottom();
  const textEl = div.querySelector(`#${id}-text`);
  if (textEl) {
    div._typingTimer = setInterval(() => {
      phraseIdx = (phraseIdx + 1) % _typingPhrases.length;
      textEl.textContent = _typingPhrases[phraseIdx];
    }, 2200);
  }
}
function removeTyping(id) {
  const el = document.getElementById(id);
  if (el?._typingTimer) clearInterval(el._typingTimer);
  el?.remove();
}

function setLoading(v) {
  isLoading = v;
  if (!agentRunning) { document.getElementById("send-btn").disabled = v; document.getElementById("chat-input").disabled = v; }
}

function resetMessages() {
  const cfg = MODE_CFG.research;
  document.getElementById("messages").innerHTML = `
    <div class="empty-state" id="empty-state">
      <div class="empty-logo-wrap">
        <img src="icons/timewarp_logo.png" id="empty-icon" alt="" onerror="this.style.display='none'">
      </div>
      <h3 id="empty-title">${cfg.emptyTitle}</h3>
      <p id="empty-desc">${cfg.emptyDesc}</p>
    </div>`;
}

function scrollBottom() { const m = document.getElementById("messages"); setTimeout(() => m.scrollTop = m.scrollHeight, 50); }
function ts() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

// ── Final JSON strip before display ──────────────────────────────────────────
function stripJson(text) {
  if (!text) return "";
  // Remove only JSON/code fences (not table or chart markdown)
  text = text.replace(/```(?:json|javascript|js|python|py|bash|sh|xml|yaml)\s*[\s\S]*?```/gi, "");
  // Remove JSON objects that look like API envelopes (not user-visible content)
  text = text.replace(/^\s*\{[^{}]*"(?:reply|response|content|message|actions|type|error)"\s*:[^{}]*\}\s*$/gm, "");
  // Remove agent meta lines
  text = text.replace(/^(?:NEXT_ACTION|ACTION|THOUGHT|PLAN|OBSERVATION)\s*:.*$/gim, "");
  // Strip suggested/follow-up question blocks — only at end of message
  text = text.replace(/\n{1,2}\*{0,2}(?:suggested follow.?up|follow.?up questions?|you (?:could|might|may) also ask|related questions?)[^:\n]*:?\*{0,2}\n[\s\S]*$/i, "");
  text = text.replace(/\n{1,2}(?:---+\n)?\*{0,2}(?:Want to|Would you like to|Curious about|Interested in)[^?\n]+\?[\s\S]*$/i, "");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

// ── Markdown ──────────────────────────────────────────────────────────────────
function md(raw) {
  // ── Pre-pass: extract and protect code blocks before escaping ────────────
  const codeBlocks = [];
  raw = raw.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang || "", code });
    return `\x00CODE${idx}\x00`;
  });

  let t = escHtml(raw);

  // ── Tables: render | col | col | rows as <table> ─────────────────────────
  t = t.replace(/((?:^[^\n]*\|[^\n]*\n)+)/gm, tableBlock => {
    const rows = tableBlock.trim().split("\n").filter(r => r.trim());
    if (rows.length < 2) return tableBlock;
    const isSep = r => /^[\s|:\-]+$/.test(r);
    let html = '<table class="md-table"><thead>';
    let inBody = false;
    rows.forEach((row, i) => {
      if (isSep(row)) { html += "</thead><tbody>"; inBody = true; return; }
      const cells = row.split("|").map(c => c.trim()).filter((c, j, a) => j > 0 && j < a.length - 1 || (j === 0 && c) || (j === a.length - 1 && c));
      const tag = (!inBody && i === 0) ? "th" : "td";
      html += "<tr>" + cells.map(c => `<${tag}>${c}</${tag}>`).join("") + "</tr>";
    });
    html += inBody ? "</tbody></table>" : "</thead></table>";
    return html;
  });

  t = t.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
  t = t.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  t = t.replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
  t = t.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
  t = t.replace(/^[\*\-•] (.+)$/gm, '<li>$1</li>');
  t = t.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul class="md-ul">${m}</ul>`);
  t = t.replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>');
  t = t.replace(/(<oli>[\s\S]*?<\/oli>\n?)+/g, m => `<ol class="md-ol">${m.replace(/<oli>/g, "<li>").replace(/<\/oli>/g, "</li>")}</ol>`);
  t = t.replace(/^---+$/gm, '<hr class="md-hr">');
  t = t.replace(/\n\n+/g, '</p><p class="md-p">');
  t = '<p class="md-p">' + t + '</p>';
  t = t.replace(/\n/g, '<br>');
  t = t.replace(/<p class="md-p"><\/p>/g, '');
  t = t.replace(/<p class="md-p">(<(?:ul|ol|h[2-4]|hr|table)[^>]*>)/g, '$1');
  t = t.replace(/(<\/(?:ul|ol|h[2-4]|hr|table)>)<\/p>/g, '$1');

  // ── Restore code blocks ───────────────────────────────────────────────────
  t = t.replace(/\x00CODE(\d+)\x00/g, (_, idx) => {
    const { lang, code } = codeBlocks[+idx];
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre class="md-pre"><code class="md-code-block${lang ? ` lang-${lang}` : ''}">${escaped}</code></pre>`;
  });

  return t;
}

function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function escAttr(s) { return String(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function sendMsg(m) { return new Promise(r => chrome.runtime.sendMessage(m, r)); }

init();
