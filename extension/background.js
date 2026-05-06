// TimeWarp – AI CEO · Background v13
// Fixes:
//  - Completion detection: ONLY fires on explicit TASK_COMPLETED signal
//  - Snapshot BEFORE CDP events (not after) — avoids executeScript/debugger conflict
//  - Improved system prompt: clearer element format, stricter JSON
//  - Action execution: uses CDP Input API for reliable trusted events
//  - failCount resets properly; no false early exit on "completed" mid-task prose

const SUPABASE_URL      = "https://ohvxqlxugqlzzbmfypiy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9odnhxbHh1Z3FsenpibWZ5cGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDY5MDAsImV4cCI6MjA4NTA4MjkwMH0.2SjRHo2c_VOWTVzMg9Y50mlnEVE64IAaC8wyvh7zaXk";
const EP_AGENT          = `${SUPABASE_URL}/functions/v1/browser-agent`;
const EP_EXT_AGENT      = `${SUPABASE_URL}/functions/v1/extension-agent`;
const EP_RESEARCH       = `${SUPABASE_URL}/functions/v1/research-chat`;

const MAX_STEPS        = 50;
const PAUSE_INTERVAL   = 20;   // ask user to continue every N steps
const SETTLE_NAVIGATE  = 3000;
const SETTLE_CLICK     = 1000;

// ── Panel open ────────────────────────────────────────────────────────────────
chrome.action.onClicked.addListener(tab => chrome.sidePanel.open({ tabId: tab.id }));

// ── Tab tracking ──────────────────────────────────────────────────────────────
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try { const t = await chrome.tabs.get(tabId); push({ type:"TAB_CHANGED", url:t.url, tabId, title:t.title }); } catch(_){}
});
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status==="complete"||info.url) push({ type:"TAB_CHANGED", url:tab.url, tabId, title:tab.title });
});

// ── Message router ────────────────────────────────────────────────────────────
let _stop = false;
let _pauseResolve = null;
let _verifyResolve = null;   // resolver for per-action verify mode
let _overlayPaused = false;  // true when user pressed Pause in the tab overlay
let _overlayResolve = null;  // resolver for overlay pause/continue
let _tabFollowerListener = null;  // module-level so cleanup works across runs
let _tabSwitchResolve    = null;
let _sessionGroupId      = null;  // Chrome tab group ID for the current employee session
let _chatAbortController = null;  // AbortController for in-flight chat fetch — lets sidepanel cancel it
let _sessionTabIds       = [];    // tabs opened in the current session
let _groupTabId          = null;  // the specific tab inside the group for action routing

// ── Business data cache ───────────────────────────────────────────────────────
// Fetched once per session, cached for 5 min. Never polled — only fetched when
// the user asks a business-related question.
let _bizCache     = null;   // { data: string, ts: number }
const BIZ_TTL_MS  = 5 * 60 * 1000;  // 5 minutes

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  // Every branch that calls reply() asynchronously must return true to keep
  // the message channel open until the response is sent.
  if (msg.type==="TIMEWARP_PING") { reply({ type:"TIMEWARP_PONG" }); return true; }
  if (msg.type==="TIMEWARP_EXECUTE_ACTION") { handleExecuteAction(msg, sender).then(reply); return true; }
  if (msg.type==="EXECUTE_ACTION")          { handleExecuteAction(msg, sender).then(reply); return true; }
  if (msg.type==="LOGIN")           { handleLogin(msg.email, msg.password).then(reply); return true; }
  if (msg.type==="LOGOUT")          { handleLogout().then(reply); return true; }
  if (msg.type==="GET_SESSION")     { getSession().then(reply); return true; }
  if (msg.type==="REFRESH_SESSION") { refreshSession().then(reply); return true; }
  if (msg.type==="START_GOOGLE_SIGN_IN") { handleStartGoogleSignIn().then(reply); return true; }
  if (msg.type==="TIMEWARP_AUTH_DELIVER") { handleAuthDeliver(msg.session, msg.nonce).then(reply); return true; }
  if (msg.type==="GET_PAGE_CONTEXT")         { getPageContext(msg.tabId).then(reply); return true; }
  if (msg.type==="TIMEWARP_GET_PAGE_CONTEXT") { handleGetGroupPageContext(msg).then(reply); return true; }
  if (msg.type==="CHAT")            { handleChat(msg).then(reply); return true; }
  if (msg.type==="RUN_AGENT_TASK")  { runAgentTask(msg).then(reply); return true; }
  if (msg.type==="STOP_AGENT")      { _stop=true; if(_pauseResolve){_pauseResolve(false);_pauseResolve=null;} if(_verifyResolve){_verifyResolve(false);_verifyResolve=null;} reply({ok:true}); return true; }
  if (msg.type==="CONTINUE_AGENT")  { if(_pauseResolve){_pauseResolve(true);_pauseResolve=null;} reply({ok:true}); return true; }
  if (msg.type==="APPROVE_ACTION")  { if(_verifyResolve){_verifyResolve(msg.approved);_verifyResolve=null;} reply({ok:true}); return true; }
  if (msg.type==="PAUSE_OVERLAY")   { _stop=false; _overlayPaused=true; reply({ok:true}); return true; }
  if (msg.type==="CONTINUE_OVERLAY"){ _overlayPaused=false; if(_overlayResolve){_overlayResolve();_overlayResolve=null;} reply({ok:true}); return true; }
  if (msg.type==="STOP_CHAT")           { if(_chatAbortController){_chatAbortController.abort();_chatAbortController=null;} reply({ok:true}); return true; }
  if (msg.type==="TIMEWARP_EMPLOYEE_START") { handleEmployeeStart(msg.payload || msg).then(reply); return true; }
  if (msg.type==="TIMEWARP_EMPLOYEE_STOP")  { handleEmployeeStop(msg.payload  || msg).then(reply); return true; }
  if (msg.type==="TIMEWARP_OVERLAY_UPDATE") {
    if (_groupTabId) {
      chrome.tabs.sendMessage(_groupTabId, { type: "TIMEWARP_OVERLAY_UPDATE", ...msg }).catch(() => {});
    }
    reply({ ok: true }); return true;
  }
});

// ── Pending auth nonce (used for Google sign-in via app bridge) ──────────────
let _pendingAuthNonce = null;

async function handleStartGoogleSignIn() {
  try {
    // Generate a one-time nonce so the app can prove the session it sends back
    // is for this specific extension request.
    const nonce = (crypto.randomUUID?.() || Math.random().toString(36).slice(2)) + Date.now();
    _pendingAuthNonce = nonce;
    const url = `https://timewarpdev.lovable.app/auth?ext_nonce=${encodeURIComponent(nonce)}`;
    await chrome.tabs.create({ url, active: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleAuthDeliver(session, nonce) {
  try {
    if (!session?.access_token || !nonce || nonce !== _pendingAuthNonce) {
      return { success: false, error: "Invalid auth delivery" };
    }
    _pendingAuthNonce = null;
    await chrome.storage.local.set({ timewarp_session: session });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── TIMEWARP_EXECUTE_ACTION ───────────────────────────────────────────────────
// Called when a content script or page forwards an action with executeInTab:true.
// Uses chrome.tabs (CDP / scripting) APIs which content scripts cannot access.
async function handleExecuteAction(msg, sender) {
  const actionName = msg.action?.action || msg.action?.type || "unknown";
  try {
    const action = msg.action;
    if (!action || (!action.type && !action.action)) {
      return { success: false, action: actionName, error: "Missing action type" };
    }

    // Normalise so _execAction always sees action.type
    if (!action.type && action.action) action.type = action.action;

    // Tab resolution:
    // targetGroupTab:true → always use the stored group tab (_groupTabId)
    // otherwise: explicit tabId → sender's tab
    const targetTabId = msg.targetGroupTab
      ? (_groupTabId || msg.tabId || sender?.tab?.id)
      : (msg.tabId || sender?.tab?.id || null);

    if (!targetTabId) {
      return { success: false, action: actionName, error: "Could not determine target tab" };
    }

    console.log("[TW executeAction] tab:", targetTabId, "groupTab:", !!msg.targetGroupTab, "action:", JSON.stringify(action));

    // For navigate actions routed to the group tab, use chrome.tabs.update
    // (avoids opening a new tab, navigates the group tab in place)
    if (msg.targetGroupTab && (action.type === "navigate" || action.type === "goto")) {
      let dest = action.url || action.selector || "";
      if (!dest) return { success: false, action: actionName, error: "No URL for navigate" };
      if (!dest.startsWith("http")) dest = "https://" + dest;
      await chrome.tabs.update(targetTabId, { url: dest });
      await new Promise(resolve => {
        const fn = (id, info) => {
          if (id === targetTabId && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(fn); resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(fn);
        setTimeout(() => { chrome.tabs.onUpdated.removeListener(fn); resolve(); }, 8000);
      });
      return { success: true, action: actionName, data: `Navigated to ${dest}` };
    }

    // Snapshot elements so index-based selectors resolve correctly
    let elements = [];
    try {
      const [r] = await chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        func: _scrapeCtx,
      });
      elements = r?.result?.elements || [];
    } catch(e) {
      console.warn("[TW executeAction] snapshot failed:", e.message);
    }

    // Attach the debugger before issuing CDP-driven click/type/press actions.
    const cdpTypes = new Set(["click","type","input","press","key_press","keypress","hover"]);
    if (cdpTypes.has((action.type||"").toLowerCase())) {
      await _ensureDebuggerAttached(targetTabId);
    }

    const raw = await _execAction(targetTabId, action, elements);

    return {
      success: raw.success === true,
      action:  actionName,
      ...(raw.success ? {} : { error: raw.error || "Action failed" }),
      ...(raw.result !== undefined ? { data: raw.result } : {}),
    };
  } catch (e) {
    console.error("[TW executeAction] error:", e.message);
    return { success: false, action: actionName, error: e.message };
  }
}

// ── TIMEWARP_GET_PAGE_CONTEXT ────────────────────────────────────────────────
// Reads page context from _groupTabId when targetGroupTab:true, otherwise falls
// back to the normal getPageContext() active-tab logic.
async function handleGetGroupPageContext(msg) {
  try {
    const tabId = (msg.targetGroupTab && _groupTabId) ? _groupTabId : (msg.tabId || null);
    if (tabId) {
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      if (tab && tab.url?.startsWith("http")) {
        const [r] = await chrome.scripting.executeScript({ target: { tabId }, func: _scrapeCtx });
        return { success: true, tabId, url: tab.url, title: tab.title, context: r?.result || null };
      }
    }
    // Fallback to active tab
    const ctx = await getPageContext(null);
    return { success: true, ...ctx };
  } catch (e) {
    console.error("[TW] handleGetGroupPageContext error:", e.message);
    return { success: false, error: e.message };
  }
}

// ── TIMEWARP_EMPLOYEE_START ───────────────────────────────────────────────────
// Handles signalStart from the webapp.
// openTab: false  → don't open a random Google tab; just create/prepare the group
//                   using the current active tab.
// employeeName    → used as the tab group title.
// Replies with { success, groupId } so the webapp can await TIMEWARP_GROUP_READY.
async function handleEmployeeStart(payload) {
  try {
    const openTab      = payload?.openTab !== false;
    const focusGroup   = payload?.focusGroup === true;
    const useTabGroup  = payload?.useTabGroup !== false;
    const employeeName = payload?.employeeName || payload?.taskName || payload?.task || "TimeWarp";
    const startUrl     = payload?.url || payload?.startUrl || "https://www.google.com";

    // Idempotent: if a session tab already exists and is alive, reuse it.
    if (_groupTabId) {
      const existing = await chrome.tabs.get(_groupTabId).catch(() => null);
      if (existing) {
        return { success: true, tabId: _groupTabId, groupId: _sessionGroupId, reused: true };
      }
      _groupTabId = null;
      _sessionGroupId = null;
      _sessionTabIds = [];
    }

    let tabId;
    if (openTab) {
      const tab = await chrome.tabs.create({ url: startUrl, active: focusGroup });
      tabId = tab.id;
    } else {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id || null;
    }

    if (!tabId) {
      return { success: false, error: "Could not create or find a tab for the session" };
    }

    _groupTabId    = tabId;
    _sessionTabIds = [tabId];

    if (useTabGroup) {
      try {
        _sessionGroupId = await chrome.tabs.group({ tabIds: [tabId] });
        await chrome.tabGroups.update(_sessionGroupId, {
          title:     employeeName.slice(0, 30),
          color:     "blue",
          collapsed: false,
        });
      } catch (e) {
        console.warn("[TW] Could not create tab group:", e.message);
        _sessionGroupId = null;
      }
    } else {
      _sessionGroupId = null;
    }

    return { success: true, tabId, groupId: _sessionGroupId };
  } catch (e) {
    console.error("[TW] handleEmployeeStart error:", e.message);
    return { success: false, error: e.message };
  }
}

// ── TIMEWARP_EMPLOYEE_STOP ────────────────────────────────────────────────────
// Closes the group tab and resets session state.
async function handleEmployeeStop(payload) {
  try {
    const closeTabGroup = payload?.closeTabGroup !== false; // default true

    if (closeTabGroup) {
      // Close the group tab specifically
      if (_groupTabId) {
        await chrome.tabs.remove(_groupTabId).catch(() => {});
        console.log("[TW] Closed group tab:", _groupTabId);
      }
      // Also close any other session tabs
      const others = _sessionTabIds.filter(id => id !== _groupTabId);
      if (others.length > 0) await chrome.tabs.remove(others).catch(() => {});
    } else if (_sessionGroupId) {
      // Ungroup without closing
      try {
        const groupTabs = await chrome.tabs.query({ groupId: _sessionGroupId });
        if (groupTabs.length > 0) await chrome.tabs.ungroup(groupTabs.map(t => t.id));
      } catch(_) {}
    }

    // Reset all session state
    _groupTabId     = null;
    _sessionGroupId = null;
    _sessionTabIds  = [];

    return { success: true };
  } catch (e) {
    console.error("[TW] handleEmployeeStop error:", e.message);
    return { success: false, error: e.message };
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function handleLogin(email, password) {
  try {
    console.log("[TW auth] Attempting login for:", email);
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:"POST", headers:{"Content-Type":"application/json", apikey:SUPABASE_ANON_KEY},
      body:JSON.stringify({ email, password }),
    });
    const raw = await r.text();
    console.log("[TW auth] Status:", r.status, "Body:", raw.slice(0, 400));
    let d = {};
    try { d = JSON.parse(raw); } catch(_) {}
    if (d.access_token) {
      const sess = { access_token:d.access_token, refresh_token:d.refresh_token, user:d.user };
      await chrome.storage.local.set({ timewarp_session:sess });
      return { success:true, session:sess };
    }
    const errMsg = d.error_description || d.message || d.error || ("HTTP " + r.status);
    if (r.status === 503 || r.status === 502 || raw.includes("Project paused") || raw.includes("upstream")) {
      return { success:false, error:"Supabase project is paused. Go to supabase.com, open your project and click Resume." };
    }
    return { success:false, error:errMsg };
  } catch(e) {
    return { success:false, error:"Network error: " + e.message };
  }
}
async function handleLogout() { _bizCache = null; await chrome.storage.local.remove("timewarp_session"); return { success:true }; }
async function getSession()   { const d = await chrome.storage.local.get("timewarp_session"); return d.timewarp_session||null; }

async function refreshSession() {
  const sess = await getSession();
  if (!sess?.refresh_token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", apikey:SUPABASE_ANON_KEY },
      body:JSON.stringify({ refresh_token: sess.refresh_token }),
    });
    const d = await r.json().catch(()=>({}));
    if (d.access_token) {
      const newSess = { access_token:d.access_token, refresh_token:d.refresh_token||sess.refresh_token, user:d.user||sess.user };
      await chrome.storage.local.set({ timewarp_session:newSess });
      return newSess;
    }
    return null;
  } catch { return null; }
}

// ── Page context (for research mode) ─────────────────────────────────────────
async function getPageContext(requestedTabId) {
  try {
    let tab;
    // 1. Try explicit tabId first
    if (requestedTabId) {
      tab = await chrome.tabs.get(requestedTabId).catch(() => null);
      if (tab && !tab.url?.startsWith("http")) tab = null;
    }
    // 2. Try active tab in the last focused window that has an http tab
    if (!tab) {
      const wins = await chrome.windows.getAll({ populate:true });
      // Sort by lastFocusedWindow — chrome doesn't give us lastFocused order directly,
      // so find the window that has an active http tab
      for (const win of wins) {
        const active = win.tabs?.find(t => t.active && t.url?.startsWith("http"));
        if (active) { tab = active; break; }
      }
    }
    // 3. Any http tab as last resort
    if (!tab) {
      const allHttpTabs = await chrome.tabs.query({ url: "http://*/*" });
      const allHttpsTabs = await chrome.tabs.query({ url: "https://*/*" });
      tab = [...allHttpsTabs, ...allHttpTabs][0] || null;
    }
    if (!tab || !tab.url?.startsWith("http")) return { url:null, tabId:null, context:null };
    const [r] = await chrome.scripting.executeScript({ target:{tabId:tab.id}, func:_scrapeCtx });
    console.log("[TW getPageContext] scraped tab:", tab.id, tab.url?.slice(0,60), "content:", r?.result?.pageContent?.length, "chars");
    return { url:tab.url, tabId:tab.id, title:tab.title, context:r?.result||null };
  } catch(e) {
    console.error("[TW getPageContext] error:", e.message);
    return { url:null, tabId:null, context:null };
  }
}
function _scrapeCtx() {
  const fields = [...document.querySelectorAll("input,textarea,select")].slice(0,20).map(e=>({
    selector:e.id?`#${e.id}`:e.name?`[name="${e.name}"]`:e.tagName.toLowerCase(),
    type:e.type||e.tagName.toLowerCase(), name:e.name||"", id:e.id||"",
    placeholder:e.placeholder||"", value:e.type==="password"?"":e.value.slice(0,50),
  }));
  const links = [...document.querySelectorAll("a[href],button,[role=button]")].slice(0,20).map(e=>({
    text:e.textContent.trim().slice(0,80), href:e.href||"", id:e.id||"",
    selector:e.id?`#${e.id}`:e.tagName.toLowerCase(),
  }));
  return { url:location.href, title:document.title,
    pageContent:document.body.innerText.slice(0,3000).replace(/\s+/g," "),
    selectedText:window.getSelection()?.toString()||"", formFields:fields, links };
}

// ── Fetch URL context by opening a background tab ────────────────────────────
async function _fetchUrlContext(url) {
  let tab;
  try {
    tab = await chrome.tabs.create({ url, active: false });
    // Wait for load
    await new Promise((resolve) => {
      const fn = (id, info) => {
        if (id === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(fn);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(fn);
      setTimeout(() => { chrome.tabs.onUpdated.removeListener(fn); resolve(); }, 8000);
    });
    await new Promise(r => setTimeout(r, 600));
    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: _scrapeCtx });
    const ctx = r?.result;
    return ctx
      ? { url: ctx.url, title: ctx.title, pageContent: ctx.pageContent,
          selectedText: "", formFields: ctx.formFields || [], links: ctx.links || [] }
      : { url, title: url, pageContent: "Could not load page content.", selectedText:"", formFields:[], links:[] };
  } catch(e) {
    return { url, title: url, pageContent: "Error loading page: " + e.message, selectedText:"", formFields:[], links:[] };
  } finally {
    if (tab) chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// ── Page snapshot (indexed accessibility tree) ────────────────────────────────
async function snapshot(tabId) {
  try {
    const [r] = await chrome.scripting.executeScript({ target:{tabId}, func:_snap });
    return r?.result||null;
  } catch(e) { console.error("[TW snap]", e.message); return null; }
}
function _snap() {
  const SEL = "a[href],button,input:not([type=hidden]),textarea,select,[role=button],[role=link],[role=checkbox],[role=radio],[role=tab],[role=menuitem],[role=combobox],[role=textbox],[contenteditable=true]";
  const seen=new Set(); const els=[]; let i=0;
  for (const el of document.querySelectorAll(SEL)) {
    const cs=getComputedStyle(el);
    if (cs.display==="none"||cs.visibility==="hidden"||cs.opacity==="0") continue;
    const r=el.getBoundingClientRect();
    if (r.width<1&&r.height<1) continue;
    let sel="";
    if (el.id) sel=`#${CSS.escape(el.id)}`;
    else if (el.getAttribute("data-testid")) sel=`[data-testid="${el.getAttribute("data-testid")}"]`;
    else if (el.name) sel=`${el.tagName.toLowerCase()}[name="${el.name}"]`;
    else if (el.getAttribute("aria-label")) sel=`[aria-label="${el.getAttribute("aria-label").replace(/"/g,'\\"')}"]`;
    else if (el.placeholder) sel=`[placeholder="${el.placeholder.replace(/"/g,'\\"')}"]`;
    else { const t=el.tagName.toLowerCase(); const p=[...document.querySelectorAll(t)].indexOf(el); sel=p>0?`${t}:nth-of-type(${p+1})`:t; }
    if (seen.has(sel)) continue; seen.add(sel);
    const txt=((el.innerText||"").trim()||(el.value||"")||(el.getAttribute("aria-label")||"")||(el.placeholder||"")).replace(/\s+/g," ").slice(0,80);
    els.push({ i:i++, tag:el.tagName.toLowerCase(), type:el.type||"", txt, sel, val:el.type==="password"?"":((el.value||"").slice(0,60)), href:el.href?el.href.slice(0,100):"" });
  }
  return { url:location.href, title:document.title, text:document.body.innerText.replace(/\s+/g," ").trim().slice(0,2000), elements:els };
}

// ── Business data fetch ───────────────────────────────────────────────────────
async function _fetchBusinessData(accessToken) {
  if (_bizCache && (Date.now() - _bizCache.ts) < BIZ_TTL_MS) {
    console.log("[TW biz] returning cached data");
    return _bizCache.data;
  }

  const h = {
    "apikey":        SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type":  "application/json",
  };
  const base = `${SUPABASE_URL}/rest/v1`;

  async function fetchTable(path) {
    try {
      const r = await fetch(`${base}/${path}`, { headers: h });
      const text = await r.text();
      console.log(`[TW biz] ${path} → ${r.status}:`, text.slice(0, 150));
      if (!r.ok) return [];
      const json = JSON.parse(text);
      return Array.isArray(json) ? json : [];
    } catch(e) {
      console.warn(`[TW biz] ${path} failed:`, e.message);
      return [];
    }
  }

  const [employees, bizData, workspaces, connections, subscriptions] = await Promise.all([
    fetchTable("ai_employees?select=*&limit=20"),
    fetchTable("user_business_data?select=*&limit=30"),   // limited — 1319 rows would overflow
    fetchTable("workspaces?select=*&limit=10"),
    fetchTable("user_connections?select=platform,status&limit=20"),
    fetchTable("user_subscriptions?select=plan,status&limit=3"),
  ]);

  const parts = [];

  if (employees.length)    parts.push(`AI Employees:\n${JSON.stringify(employees, null, 1)}`);
  // Summarise business data compactly — don't dump all 1319 rows
  if (bizData.length) {
    const summary = bizData.slice(0, 30).map(r => {
      const vals = Object.entries(r).filter(([k]) => k !== "id" && k !== "user_id" && k !== "created_at").map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join(", ");
      return vals;
    }).join("\n");
    parts.push(`Business Data (showing ${bizData.length} entries):\n${summary}`);
  }
  if (workspaces.length)   parts.push(`Workspaces:\n${JSON.stringify(workspaces, null, 1)}`);
  if (connections.length)  parts.push(`Connected Integrations:\n${JSON.stringify(connections, null, 1)}`);
  if (subscriptions.length) parts.push(`Subscription:\n${JSON.stringify(subscriptions, null, 1)}`);

  // Hard cap: never inject more than 4000 chars into the prompt
  let combined = parts.join("\n\n");
  if (combined.length > 4000) combined = combined.slice(0, 4000) + "\n... (truncated)";

  const data = combined.trim()
    ? `<user_data>\n${combined}\n</user_data>`
    : null;

  _bizCache = { data, ts: Date.now() };
  console.log("[TW biz] built data block, chars:", data?.length || 0);
  return data;
}

// ── Research (single-turn) ────────────────────────────────────────────────────
async function handleChat({ messages, pageContext, tabId, scrapeUrl, researchUrls }) {
  const sess = await getSession();
  if (!sess) return { error:"Not logged in." };

  // ── Step 1: classify the question BEFORE scraping anything ───────────────
  const lastUserMsg = (messages.slice().reverse().find(m => m.role === "user")?.content || "");
  const q = lastUserMsg.toLowerCase().trim();

  const isPageQuestion = /\b(this page|current page|on this page|the article|the post|this site|this url|what does it say|summarize this|summarise this|what is this page|what does this (page|site|article)|explain this page|tell me about this page|what are they (selling|offering)|screenshot|what do you see)\b/.test(q)
    || /^(what|who|where|when|why|how|summarize|summarise|explain|describe|analyse|analyze)\b/.test(q) && q.length < 60 && !q.includes("is ")
    || (scrapeUrl != null);

  const isGeneralQuestion = !isPageQuestion || /^(what is |who is |how (do|does|to|can|should) |why (is|does|do|are) |when (did|was|is) |can you |please |write |create |make |give me |list |explain |define |code |calc |help me |what are the |how many |what does [a-z]+ mean)/i.test(lastUserMsg);

  // Detect business-related questions — fetch user data only when needed.
  // Cast wide — better to fetch unnecessarily than to miss and give generic answers.
  const isBusinessQuestion = /\b(brand|product|audience|customer|business|company|employee|team|workspace|subscription|plan|integration|account|my data|timewarp|ai employee|who (am i|are we|is my)|what (do i|do we)|how (do i|does my)|my (name|voice|tone|values|colors?|colour|logo|mission|vision|niche|offer|service|pricing))\b/i.test(lastUserMsg)
    || /^(who|what|how|tell me about my|describe my|summarize my|what is my|what are my)/i.test(q);

  // ── Step 2a: fetch business data if needed (cached, never polled) ─────────
  let bizBlock = null;
  if (isBusinessQuestion) {
    try {
      bizBlock = await _fetchBusinessData(sess.access_token);
    } catch(e) {
      console.warn("[TW biz] fetch failed:", e.message);
    }
  }

  // ── Step 2b: only scrape page content if the question actually needs it ────
  let ctxBlocks = [];
  const needsPageCtx = isPageQuestion && !isGeneralQuestion;

  if (needsPageCtx) {
    if (researchUrls && researchUrls.length > 0) {
      for (const url of researchUrls) {
        if (!url) continue;
        const fetched = await _fetchUrlContext(url);
        if (fetched?.pageContent) ctxBlocks.push(fetched);
      }
    } else if (scrapeUrl) {
      const fetched = await _fetchUrlContext(scrapeUrl);
      if (fetched?.pageContent) ctxBlocks.push(fetched);
    } else if (tabId) {
      const live = await getPageContext(tabId);
      const lc = live?.context;
      if (lc?.pageContent) ctxBlocks.push({ url:lc.url||"", title:lc.title||"", pageContent:lc.pageContent });
    }
  }

  // Also always scrape live tab context so the AI can answer page questions
  // even when the question is ambiguous — AI will ask a follow-up if unsure.
  if (!needsPageCtx && tabId && ctxBlocks.length === 0) {
    try {
      const live = await getPageContext(tabId);
      const lc = live?.context;
      if (lc?.pageContent) ctxBlocks.push({ url:lc.url||"", title:lc.title||"", pageContent:lc.pageContent });
    } catch(_) {}
  }

  console.log("[TW chat] needsPageCtx:", needsPageCtx, "ctxBlocks:", ctxBlocks.length, "q:", q.slice(0, 80));

  // ── Step 3: build messages ────────────────────────────────────────────────
  const pageBlock = ctxBlocks.length > 0
    ? ctxBlocks.map(c =>
        `<page_context>\nURL: ${c.url}\nTitle: ${c.title}\n\nContent:\n${c.pageContent.slice(0, 4000)}\n</page_context>`
      ).join("\n\n")
    : null;

  const rawMsgs = messages.slice(-12);
  const firstUserIdx = rawMsgs.findIndex(m => m.role === "user");

  const systemMsg = {
    role: "user",
    content: `[SYSTEM]
You are a helpful AI assistant. Answer questions clearly and directly.

${bizBlock ? `The user's account data is in <user_data> tags below. For questions about brand, product, audience, business, employees, or workspaces — reference this data specifically. Do NOT give generic advice when real data is available.\n\n${bizBlock}` : ""}
${pageBlock ? `\nThe current page context is available below. Use it if the user's question relates to the page they are viewing.\n\n${pageBlock}` : ""}
${!bizBlock && !pageBlock ? "Answer from your knowledge." : ""}

Rules:
- If a question is ambiguous and you are not sure whether the user wants page info, business info, or general help — ask one short clarifying question before answering.
- Only discuss email, calendar, files, or integrations if explicitly asked.
- Do not introduce yourself.
- End responses with 1-3 short follow-up questions inside a [SUGGEST:...] block like this: [SUGGEST: Question 1 | Question 2 | Question 3]

Acknowledge with only: "Understood."`
  };
  const systemAck = { role: "assistant", content: "Understood." };

  const msgsToSend = [systemMsg, systemAck, ...rawMsgs];

  // Dedup + cap
  const deduped = [];
  for (const m of msgsToSend) {
    const last = deduped[deduped.length - 1];
    if (last && last.role === m.role && last.content === m.content) continue;
    deduped.push(m);
  }
  const cappedMsgs = deduped.length > 14 ? [deduped[0], deduped[1], ...deduped.slice(-12)] : deduped;

  // Pass empty pageContext to edge function so it doesn't inject its own page ctx
  const edgePageCtx = needsPageCtx && ctxBlocks[0]
    ? { url: ctxBlocks[0].url, title: ctxBlocks[0].title, pageContent: "" }
    : { url: "", title: "", pageContent: "" };

  // Abort any previous in-flight chat request
  if (_chatAbortController) { _chatAbortController.abort(); }
  _chatAbortController = new AbortController();
  const _chatSignal = _chatAbortController.signal;
  const _chatTimeout = setTimeout(() => { if (_chatAbortController) _chatAbortController.abort(); }, 20000);

  try {
    const r = await fetch(EP_RESEARCH, {
      method:"POST",
      headers:{ "Content-Type":"application/json", apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${sess.access_token}` },
      body:JSON.stringify({ messages:cappedMsgs, pageContext:edgePageCtx }),
      signal: _chatSignal,
    });
    clearTimeout(_chatTimeout);
    _chatAbortController = null;
    if (r.status===401) { await chrome.storage.local.remove("timewarp_session"); return { error:"Session expired.", sessionExpired:true }; }
    const raw = await r.text();
    console.log("[TW chat] status:", r.status, "raw:", raw.slice(0, 400));
    if (!r.ok) return { error:_extractError(raw)||`Server error ${r.status}` };
    const prose = _extractProse(raw);
    if (!prose) return { error:"Empty AI response." };
    const { reply, suggestions } = _pullSuggestions(prose);
    return { reply: reply || "Done.", suggestions: suggestions || [] };
  } catch(e) {
    clearTimeout(_chatTimeout);
    _chatAbortController = null;
    if (e.name === "AbortError") return { error:"__stopped__" };
    return { error:e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function runAgentTask({ goal, tabId:userTabId, messages, pageContext, verifyMode, contextUrls }) {
  _stop = false;
  _stopTabFollower(); // clean up any stale listener from a previous run

  console.log("[TW] Goal:", goal);

  // NOTE: resolve startUrl from raw goal BEFORE appending contextUrls,
  // otherwise the URL regex picks up the current page URL from contextUrls.
  const rawGoal = goal;
  let expandedGoal = goal;

  // If caller provided extra context URLs, append them
  if (contextUrls && contextUrls.length > 0) {
    const urlList = contextUrls.map(u => `- ${u}`).join("\n");
    expandedGoal = `${expandedGoal}\n\n[Additional context URLs:\n${urlList}]`;
  }
  const sess = await getSession();
  if (!sess) return { ok:false, reply:"Not logged in." };

  push({ type:"AGENT_STEP", step:0, total:MAX_STEPS, status:"starting", label:"🌐 Opening working tab…" });

  // ── Open working tab ──────────────────────────────────────────────────────
  let workTabId;
  let agentGroupId = null;
  try {
    // Extract the target URL from rawGoal only — NOT expandedGoal which may contain
    // contextUrls from the research panel (current page URL etc.) that would confuse extraction.
    // Priority: explicit https:// URL → domain with TLD → known service name → Google.
    // NEVER inherit the user's current tab — always open a fresh tab.
    let startUrl = "https://www.google.com";

    // 1. Full https:// or http:// URL
    const fullUrl = rawGoal.match(/https?:\/\/[^\s"'\)\]]+/i);
    if (fullUrl) {
      startUrl = fullUrl[0].replace(/[.,;]+$/, "");
    } else {
      // 2. Domain with recognised TLD anywhere in goal
      const domainMatch = rawGoal.match(/\b([a-zA-Z0-9-]+\.(?:com|org|net|io|co|app|dev|ai|uk|se|de|fr|nl|au|ca|shop|store|gg|tv|me|us|gov|edu))(?:\/[^\s"'\)\]]*)?\b/i);
      if (domainMatch) {
        startUrl = "https://" + domainMatch[0].replace(/[.,;]+$/, "");
      } else {
        // 3. "Go To <name>" where name is a known service (no TLD needed)
        const gotoMatch = rawGoal.match(/^go to\s+([a-zA-Z0-9-]+)/i);
        if (gotoMatch) {
          const name = gotoMatch[1].toLowerCase();
          const knownServices = {
            instagram:"instagram.com", facebook:"facebook.com", twitter:"twitter.com",
            x:"x.com", linkedin:"linkedin.com", youtube:"youtube.com", tiktok:"tiktok.com",
            amazon:"amazon.com", google:"google.com", gmail:"mail.google.com",
            shopify:"admin.shopify.com", reddit:"reddit.com", pinterest:"pinterest.com",
            snapchat:"snapchat.com", whatsapp:"web.whatsapp.com", canva:"canva.com",
            notion:"notion.so", slack:"app.slack.com", github:"github.com",
            netflix:"netflix.com", spotify:"spotify.com", airbnb:"airbnb.com",
            ebay:"ebay.com", etsy:"etsy.com", uber:"uber.com", stripe:"dashboard.stripe.com",
          };
          if (knownServices[name]) {
            startUrl = "https://" + knownServices[name];
          }
        }
      }
    }

    console.log("[TW agent] Goal:", expandedGoal.slice(0, 80));
    console.log("[TW agent] Start URL:", startUrl);

    console.log("[TW agent] Opening tab on:", startUrl);
    const tab = await chrome.tabs.create({ url:startUrl, active:true });
    workTabId = tab.id;
    if (!_sessionTabIds.includes(workTabId)) _sessionTabIds.push(workTabId);
    push({ type:"AGENT_TAB_CREATED", tabId:workTabId });

    // ── Group the working tab ────────────────────────────────────────────────
    try {
      agentGroupId = await chrome.tabs.group({ tabIds: [workTabId] });
      await chrome.tabGroups.update(agentGroupId, { title: "TimeWarp Agent", color: "blue", collapsed: false });
      console.log("[TW agent] Tab grouped, groupId:", agentGroupId);
    } catch(grpErr) {
      console.warn("[TW agent] Could not create tab group:", grpErr.message);
    }

    // Wait for tab to finish loading
    await new Promise(resolve => {
      const onUpdate = (id, info) => {
        if (id===workTabId && info.status==="complete") { chrome.tabs.onUpdated.removeListener(onUpdate); resolve(); }
      };
      chrome.tabs.onUpdated.addListener(onUpdate);
      setTimeout(() => { chrome.tabs.onUpdated.removeListener(onUpdate); resolve(); }, 8000);
    });
    await _sleep(500); // extra settle

    // Attach CDP debugger
    let attached = false;
    for (let attempt=0; attempt<3; attempt++) {
      try {
        await chrome.debugger.attach({ tabId:workTabId }, "1.3");
        attached = true;
        console.log("[TW] CDP attached to tab", workTabId);
        await _injectOverlay(workTabId);
        break;
      } catch(dbgErr) {
        if (dbgErr.message?.includes("already attached")) {
          attached = true;
          await _injectOverlay(workTabId); // still inject overlay even if already attached
          break;
        }
        console.warn(`[TW] CDP attach attempt ${attempt+1} failed:`, dbgErr.message);
        await _sleep(1000);
      }
    }
    if (!attached) {
      _stopTabFollower();
      push({ type:"AGENT_STEP", step:0, total:MAX_STEPS, status:"failed", label:"❌ Could not attach debugger" });
      return { ok:false, reply:"Could not attach debugger. Close DevTools on the tab and try again." };
    }
  } catch(e) {
    _stopTabFollower();
    return { ok:false, reply:`Could not open working tab: ${e.message}` };
  }

  async function detach() {
    _stopTabFollower();
    // Detach CDP from every tab we opened during this run
    for (const tid of (typeof agentTabIds !== "undefined" ? agentTabIds : [workTabId])) {
      try { await chrome.debugger.detach({ tabId:tid }); } catch(_){}
    }
  }

  // ── Tab follower ──────────────────────────────────────────────────────────
  // Multi-tab support: when the agent opens a new tab (or a site opens one),
  // we keep CDP attached to ALL tabs in the group and move workTabId to the
  // newest tab so the agent continues there. Old tabs stay alive and CDP-attached
  // so the agent can navigate back to them if needed.

  // Set of all tab IDs currently managed by this agent run
  const agentTabIds = new Set([workTabId]);

  async function _attachToTab(tabId) {
    for (let a = 0; a < 4; a++) {
      try { await chrome.debugger.attach({ tabId }, "1.3"); return true; }
      catch(e) { if (e.message?.includes("already attached")) return true; await _sleep(600); }
    }
    return false;
  }

  function _startTabFollower() {
    _tabFollowerListener = async (newTab) => {
      const newTabId = typeof newTab === "number" ? newTab : newTab.id;
      if (agentTabIds.has(newTabId)) return; // already tracking
      if (_stop) return;
      try {
        // Wait for new tab to fully load (8 s max)
        await new Promise(resolve => {
          const fn = (id, info) => {
            if (id === newTabId && info.status === "complete") {
              chrome.tabs.onUpdated.removeListener(fn); resolve();
            }
          };
          chrome.tabs.onUpdated.addListener(fn);
          setTimeout(() => { chrome.tabs.onUpdated.removeListener(fn); resolve(); }, 8000);
        });
        await _sleep(500);

        // Pull into agent tab group (or session group if one exists)
        const groupToUse = agentGroupId || _sessionGroupId || null;
        if (groupToUse) {
          try { await chrome.tabs.group({ tabIds: [newTabId], groupId: groupToUse }); } catch(_) {}
        }

        // Attach CDP and check content
        const attached = await _attachToTab(newTabId);
        let hasContent = false, newUrl = "";
        if (attached) {
          try {
            const [r] = await chrome.scripting.executeScript({ target:{ tabId:newTabId }, func:_scrapeCtx });
            const snap = r?.result;
            newUrl = snap?.url || "";
            const blank = !newUrl || newUrl === "about:blank" || newUrl.startsWith("chrome://");
            hasContent = !blank && (snap?.pageContent || "").trim().length > 80;
          } catch(_) {}
        }

        if (!hasContent) {
          // Empty/blank tab — close it, don't track
          console.log("[TW follower] new tab blank, closing:", newTabId);
          if (attached) { try { await chrome.debugger.detach({ tabId:newTabId }); } catch(_){} }
          chrome.tabs.remove(newTabId).catch(() => {});
        } else {
          // Real content — add to our set and move agent focus here
          console.log("[TW follower] new tab has content, tracking:", newTabId, newUrl.slice(0, 60));
          agentTabIds.add(newTabId);
          workTabId = newTabId; // agent continues in newest tab
          if (!_sessionTabIds.includes(newTabId)) _sessionTabIds.push(newTabId);

          await _injectOverlay(workTabId);

          // Refresh overlay on all other tracked tabs too
          for (const tid of agentTabIds) {
            if (tid !== workTabId) _injectOverlay(tid).catch(() => {});
          }

          push({ type:"AGENT_TAB_CREATED", tabId:workTabId });
          push({ type:"AGENT_STEP", step:0, total:MAX_STEPS, status:"thinking",
                 label:"🔀 New tab opened — continuing…" });
        }
      } catch(e) {
        console.warn("[TW follower] error:", e.message);
      } finally {
        if (_tabSwitchResolve) { _tabSwitchResolve(); _tabSwitchResolve = null; }
      }
    };
    chrome.tabs.onCreated.addListener(_tabFollowerListener);
  }

  // Arm before a click — blocks main loop until follower finishes or timeout
  function _armTabGate(ms = 6000) {
    return new Promise(resolve => {
      _tabSwitchResolve = resolve;
      setTimeout(() => { if (_tabSwitchResolve) { _tabSwitchResolve = null; resolve(); } }, ms);
    });
  }

  function _stopTabFollower() {
    if (_tabFollowerListener) {
      chrome.tabs.onCreated.removeListener(_tabFollowerListener);
      _tabFollowerListener = null;
    }
    if (_tabSwitchResolve) { _tabSwitchResolve(); _tabSwitchResolve = null; }
  }
  _startTabFollower();

  const stepLog = [];
  let steps = 0;
  let lastReply = "";
  let failCount = 0;       // consecutive turns with zero actions
  let errCount = 0;        // consecutive action execution errors
  let stuckCount = 0;      // consecutive turns with identical page state
  let lastPageSig = "";
  let actionHistory = [];  // last 5 action signatures for loop detection

  // Strip "Go To " prefix for the AI's conversation — keep the raw goal for URL extraction
  // but give the AI a clean task description without the navigation keyword.
  const cleanGoal = expandedGoal.replace(/^go to\s+/i, "").trim();

  // Conversation sent to AI each turn
  const conv = [{ role:"user", content:`Your task: ${cleanGoal}\n\nStart by navigating to the correct website if you are not already there.` }];

  try {
    while (steps < MAX_STEPS && !_stop) {
      steps++;

      // ── Auto-pause ───────────────────────────────────────────────────────
      if (steps > 1 && (steps-1) % PAUSE_INTERVAL === 0) {
        push({ type:"AGENT_PAUSE_ASK", step:steps, total:MAX_STEPS, label:`⏸ Completed ${steps-1} steps. Continue?` });
        const cont = await new Promise(res => { _pauseResolve = res; });
        _pauseResolve = null;
        if (!cont || _stop) {
          push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"stopped", label:"⏹ Stopped at pause" });
          await detach();
          return { ok:false, reply:"Stopped. Tab left open for you to take over.", stepLog };
        }
      }

      // ── Snapshot ──────────────────────────────────────────────────────────
      push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"thinking", label:"📸 Reading page…" });
      let s = await snapshot(workTabId);
      if (!s) {
        await _sleep(2500);
        s = await snapshot(workTabId);
      }
      if (!s) {
        push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"failed", label:"❌ Can't read page" });
        break;
      }

      // ── Stuck detection ───────────────────────────────────────────────────
      const pageSig = s.url + "|" + s.text.slice(0,500).replace(/\d/g,"#");
      if (pageSig === lastPageSig) {
        stuckCount++;
        if (stuckCount >= 5) {
          push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"failed", label:"⚠️ Page frozen — stopping" });
          await detach();
          return { ok:false, reply:"The page stopped changing. Possible popup or login wall blocking progress.", stepLog };
        }
      } else { stuckCount = 0; }
      lastPageSig = pageSig;

      // ── Build element list for AI ─────────────────────────────────────────
      const elLines = s.elements.slice(0,70).map(e => {
        const kind = e.type ? `[${e.type}]` : `[${e.tag}]`;
        const val  = e.val  ? ` val="${e.val}"` : "";
        const href = e.href ? ` -> ${e.href.slice(0,60)}` : "";
        return `[${e.i}] ${kind} "${e.txt||e.sel}"${val}${href}`;
      }).join("\n");

      const pageState = `URL: ${s.url}\nTitle: ${s.title}\n\nPage text (first 1200 chars):\n${s.text.slice(0,1200)}\n\nClickable/interactive elements:\n${elLines}`;

      // ── Ask AI ────────────────────────────────────────────────────────────
      push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"thinking", label:`🧠 Step ${steps} — thinking…` });

      // Keep conv trimmed: always include first message (the goal) + last 10
      const history = conv.length > 11 ? [conv[0], ...conv.slice(-10)] : [...conv];
      const aiRes = await _callAI(history, pageState);

      if (!aiRes.ok) {
        const errLabel = "❌ AI error: " + (aiRes.error||"unknown error").slice(0, 120);
        push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"failed", label: errLabel });
        console.error("[TW agent] AI call failed:", aiRes.error);
        break;
      }

      const { reply, actions } = aiRes;
      lastReply = reply;
      console.log(`[TW] step ${steps}: "${reply.slice(0,100)}" actions=`, JSON.stringify(actions));
      push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"thinking", label:`🤔 ${reply.slice(0,100)}${reply.length>100?"…":""}` });

      // ── Completion check — ONLY fire on explicit signal ───────────────────
      if (reply.includes("TASK_COMPLETED")) {
        const summary = reply.replace("TASK_COMPLETED","").replace(/^[\s\-–:]+/,"").trim() || "Task completed.";
        push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"done", label:"✅ Task complete" });
        _pushOverlayStatus(workTabId, "Task complete", true, true);
        stepLog.push({ step:steps, label:"Complete", success:true });
        await detach();
        return { ok:true, reply:summary, stepLog };
      }

      // ── Manual takeover required (login / payment detected) ───────────────
      if (reply.includes("MANUAL_TAKEOVER_REQUIRED")) {
        const reason = reply.replace("MANUAL_TAKEOVER_REQUIRED","").replace(/^[\s\-–:]+/,"").trim();
        push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"paused", label:"🔒 " + reason });
        push({ type:"AGENT_MANUAL_TAKEOVER", reason });
        _pushOverlayStatus(workTabId, "⏸ Manual step needed — check extension", false, true);
        // Wait for user to resume or stop
        _overlayPaused = true;
        await new Promise(res => { _overlayResolve = res; });
        _overlayPaused = false;
        if (_stop) { await detach(); return { ok:false, reply:"Stopped during manual takeover.", stepLog }; }
        conv.push({ role:"user", content:"The user has completed the manual step. Please continue the task from where you left off." });
        continue;
      }

      // ── Hard safety check: detect login/payment pages regardless of AI reply ──
      const pageTextLower = s.text.toLowerCase();
      const isLoginPage   = /\b(sign in|log in|login|sign up|create account|register|password)\b/.test(pageTextLower)
                         && /\b(email|username|phone)\b/.test(pageTextLower);
      const isPaymentPage = /\b(card number|credit card|debit card|cvv|expiry|payment method|checkout|place order|pay now|subscribe|billing)\b/.test(pageTextLower);

      if (isLoginPage || isPaymentPage) {
        const kind = isPaymentPage ? "Payment/checkout" : "Login/signup";
        const safetyMsg = `🔒 ${kind} page detected — manual takeover required. Complete this step in the browser, then press Continue.`;
        push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"paused", label:safetyMsg });
        push({ type:"AGENT_MANUAL_TAKEOVER", reason:safetyMsg });
        _pushOverlayStatus(workTabId, `⏸ ${kind} — manual step needed`, false, true);
        _overlayPaused = true;
        await new Promise(res => { _overlayResolve = res; });
        _overlayPaused = false;
        if (_stop) { await detach(); return { ok:false, reply:"Stopped during manual takeover.", stepLog }; }
        conv.push({ role:"user", content:"The user has completed the manual step. Please continue the task from where you left off." });
        continue;
      }

      conv.push({ role:"assistant", content:reply });

      // ── No actions returned ───────────────────────────────────────────────
      if (!actions || actions.length===0) {
        failCount++;
        if (failCount >= 4) {
          push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"failed", label:"⚠️ AI stuck — no actions for 4 turns" });
          await detach();
          return { ok:false, reply:"The AI could not decide on a next action. The page may be blocking automation.", stepLog };
        }
        conv.push({ role:"user", content:`Step ${steps} page state:\n${pageState}\n\nYou must return at least one action. If the page is still loading, use {"type":"wait"}. Otherwise take the next logical step toward the goal.` });
        await _sleep(1500);
        continue;
      }
      failCount = 0;

      // ── Loop detection ────────────────────────────────────────────────────
      const actionSig = JSON.stringify(actions.map(a=>({t:a.type,i:a.index,u:a.url})));
      if (actionHistory.slice(-3).every(h=>h===actionSig)) {
        conv.push({ role:"user", content:"You've tried the exact same action 3 times in a row and the page hasn't changed. Try a DIFFERENT approach: scroll down, look for a different button, or navigate to a different page." });
      }
      actionHistory.push(actionSig);
      if (actionHistory.length>8) actionHistory.shift();

      // ── Execute actions ───────────────────────────────────────────────────
      let didNavigate = false;
      for (const action of actions) {
        if (_stop) break;

        // ── Overlay pause: wait until user hits Continue ───────────────────
        if (_overlayPaused) {
          push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"thinking", label:"⏸ Paused — press Continue on the tab" });
          await new Promise(res => { _overlayResolve = res; });
          _overlayResolve = null;
          if (_stop) break;
        }

        // Map index → selector from current snapshot
        const idxRaw = action.index ?? action.i;
        if (idxRaw !== undefined && idxRaw !== null) {
          const mapped = s.elements.find(e => e.i===parseInt(idxRaw,10));
          if (mapped) {
            action.selector = action.selector || mapped.sel;
            action.elText   = action.elText   || mapped.txt;
          }
        }

        const actionType = (action.type || "").toLowerCase();

        const label = _descAction(action);

        // ── Verify mode: ask user to approve each action ──────────────────
        if (verifyMode) {
          push({ type:"AGENT_VERIFY_ACTION", step:steps, label, action:{
            type:action.type, index:action.index, text:action.text,
            url:action.url, key:action.key, direction:action.direction,
            elText:action.elText, selector:action.selector,
          }});
          const approved = await new Promise(res => { _verifyResolve = res; });
          _verifyResolve = null;
          if (!approved || _stop) {
            push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"stopped", label:"⏹ Action rejected by user" });
            await detach();
            return { ok:false, reply:"Task stopped — action was rejected.", stepLog };
          }
        }

        push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"executing", label });
        _pushOverlayStatus(workTabId, label);

        // Arm the tab gate BEFORE executing a click so the follower can signal
        // us when it has finished switching tabs (or the timeout fires if no new tab)
        const gate = actionType === "click" ? _armTabGate(6000) : null;

        const exec = await _execAction(workTabId, action, s.elements);
        stepLog.push({ step:steps, label, success:exec.success, detail:exec.result||exec.error });
        push({ type:"AGENT_STEP_DONE", step:steps, success:exec.success, label, detail:exec.result||exec.error||"" });
        console.log(`[TW exec] ${exec.success?"✓":"✗"} ${exec.result||exec.error}`);

        if (actionType === "navigate") didNavigate = true;

        // Await gate — instant if no new tab opened, blocks until follower done otherwise
        if (gate) await gate;

        if (exec.success) errCount=0; else errCount++;
        if (errCount >= 5) {
          push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"failed", label:"❌ 5 consecutive failures" });
          await detach();
          return { ok:false, reply:`Stopped after 5 consecutive action failures. Last error: ${exec.error}`, stepLog };
        }
        if (actions.length > 1) await _sleep(400);
      }

      // Feed results back to AI
      const results = stepLog.slice(-actions.length).map(x=>`${x.success?"✓":"✗"} ${x.label}`).join("; ");
      conv.push({ role:"user", content:`Actions done: ${results}\n\nCurrent page state:\n${pageState}\n\nContinue the task. If fully complete, reply with TASK_COMPLETED.` });

      await _sleep(didNavigate ? SETTLE_NAVIGATE : SETTLE_CLICK);
      // Re-inject overlay into the active tab AND every other tab in the group
      if (!_stop) {
        await _injectOverlay(workTabId);
        if (agentGroupId) {
          try {
            const groupTabs = await chrome.tabs.query({ groupId: agentGroupId });
            for (const t of groupTabs) {
              if (t.id !== workTabId) _injectOverlay(t.id).catch(() => {});
            }
          } catch(_) {}
        }
      }
    }

    // Loop exited
    if (_stop) {
      push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"stopped", label:"⏹ Stopped" });
    _pushOverlayStatus(workTabId, "Stopped", true, false);
    } else if (steps>=MAX_STEPS) {
      push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"paused", label:`⏸ Reached ${MAX_STEPS}-step limit` });
    }
    await detach();
    return { ok:false, reply:lastReply||`Agent stopped at step ${steps}.`, stepLog };

  } catch(e) {
    console.error("[TW agent crash]", e);
    push({ type:"AGENT_STEP", step:steps, total:MAX_STEPS, status:"failed", label:"💥 " + e.message.slice(0,50) });
    await detach();
    return { ok:false, reply:`Agent crashed: ${e.message}`, stepLog };
  }
}

// ── Tab overlay helpers — inject and update directly from background ──────────
async function _injectOverlay(tabId) {
  if (!tabId) return;
  try {
    await chrome.scripting.executeScript({ target:{ tabId }, func:() => {
      if (document.getElementById("__tw_overlay__")) return;
      const st = document.createElement("style");
      st.textContent = `
        @keyframes __tw_s__  { 0%{transform:translateX(-100%) skewX(-12deg)}100%{transform:translateX(250%) skewX(-12deg)} }
        @keyframes __tw_p__  { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)} }
        #__tw_overlay__ {
          position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;
          width:min(680px,calc(100vw - 40px));
          font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;
          background:linear-gradient(135deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0.07) 40%,rgba(180,180,255,0.10) 70%,rgba(255,255,255,0.13) 100%);
          backdrop-filter:blur(40px) saturate(2.2) brightness(1.15);
          -webkit-backdrop-filter:blur(40px) saturate(2.2) brightness(1.15);
          border-radius:24px;border:1px solid rgba(255,255,255,0.30);
          border-top:1px solid rgba(255,255,255,0.50);
          box-shadow:0 32px 64px rgba(0,0,0,0.40),0 8px 24px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.55);
          overflow:hidden;
        }
        #__tw_overlay__::after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);animation:__tw_s__ 4s ease-in-out infinite;pointer-events:none;}
        .__tw_b__{border-radius:12px;font-size:12.5px;font-weight:700;cursor:pointer;padding:9px 20px;transition:all 0.15s;white-space:nowrap;background:rgba(60,60,80,0.92);border:1.5px solid rgba(255,255,255,0.22);color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.40),inset 0 1px 0 rgba(255,255,255,0.18);}
        .__tw_pau__{background:rgba(245,158,11,0.90);border-color:rgba(255,200,80,0.55);}
        .__tw_stp__{background:rgba(220,38,38,0.90);border-color:rgba(255,120,120,0.50);}
        .__tw_con__{background:rgba(34,197,94,0.90);border-color:rgba(100,255,150,0.45);}
        #__tw_dot__{width:7px;height:7px;border-radius:50%;background:#a78bfa;box-shadow:0 0 6px rgba(167,139,250,0.8);animation:__tw_p__ 1.6s ease-in-out infinite;flex-shrink:0;}
      `;
      document.head.appendChild(st);
      const ov = document.createElement("div");
      ov.id = "__tw_overlay__";
      ov.innerHTML =
        '<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">' +
            '<div style="width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,rgba(167,139,250,0.7),rgba(99,102,241,0.6));border:1px solid rgba(255,255,255,0.30);display:flex;align-items:center;justify-content:center;font-size:14px;">\u23f1</div>' +
            '<div><div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.9);letter-spacing:0.8px;text-transform:uppercase;">TimeWarp</div>' +
            '<div style="font-size:9px;color:rgba(255,255,255,0.45);margin-top:1px;">AI Agent</div></div>' +
          '</div>' +
          '<div style="width:1px;height:28px;background:rgba(255,255,255,0.15);flex-shrink:0;"></div>' +
          '<div style="display:flex;align-items:center;gap:7px;flex:1;min-width:0;">' +
            '<div id="__tw_dot__"></div>' +
            '<div id="__tw_lbl__" style="font-size:12px;color:rgba(255,255,255,0.75);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Running task\u2026</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">' +
            '<button id="__tw_pau__" class="__tw_b__ __tw_pau__">\u23f8 Pause</button>' +
            '<button id="__tw_con__" class="__tw_b__ __tw_con__" style="opacity:0.4;pointer-events:none;">\u25b6 Continue</button>' +
            '<button id="__tw_stp__" class="__tw_b__ __tw_stp__">\u25a0 Stop</button>' +
          '</div>' +
        '</div>' +
        '<div style="height:2px;background:rgba(255,255,255,0.06);overflow:hidden;">' +
          '<div id="__tw_bar__" style="height:100%;width:0%;background:linear-gradient(90deg,rgba(167,139,250,0.9),rgba(99,102,241,0.7),rgba(59,171,255,0.8));transition:width 0.6s cubic-bezier(0.4,0,0.2,1);box-shadow:0 0 8px rgba(167,139,250,0.6);"></div>' +
        '</div>';
      document.documentElement.appendChild(ov);
      let _n=0;
      const lbl=ov.querySelector("#__tw_lbl__"),dot=ov.querySelector("#__tw_dot__"),
            bar=ov.querySelector("#__tw_bar__"),pau=ov.querySelector("#__tw_pau__"),
            con=ov.querySelector("#__tw_con__"),stp=ov.querySelector("#__tw_stp__");
      pau.addEventListener("click",()=>{
        pau.style.opacity="0.4";pau.style.pointerEvents="none";
        con.style.opacity="1";con.style.pointerEvents="";
        lbl.textContent="Paused \u2014 press Continue";lbl.style.color="#fbbf24";
        dot.style.background="#fbbf24";dot.style.animationPlayState="paused";
        window.postMessage({__tw__:true,action:"PAUSE"},"*");
      });
      con.addEventListener("click",()=>{
        con.style.opacity="0.4";con.style.pointerEvents="none";
        pau.style.opacity="1";pau.style.pointerEvents="";
        lbl.textContent="Running task\u2026";lbl.style.color="rgba(255,255,255,0.75)";
        dot.style.background="#a78bfa";dot.style.animationPlayState="running";
        window.postMessage({__tw__:true,action:"CONTINUE"},"*");
      });
      stp.addEventListener("click",()=>{
        lbl.textContent="Stopping\u2026";lbl.style.color="#f87171";dot.style.background="#f87171";
        pau.style.opacity="0.4";pau.style.pointerEvents="none";
        con.style.opacity="0.4";con.style.pointerEvents="none";
        window.postMessage({__tw__:true,action:"STOP"},"*");
      });
      window.addEventListener("message",e=>{
        if(e.data?.__tw_update__){
          lbl.textContent=e.data.label||"Running\u2026";lbl.style.color="rgba(255,255,255,0.75)";
          _n=Math.min(_n+1,38);if(bar)bar.style.width=Math.round((_n/40)*100)+"%";
          dot.style.background="#a78bfa";dot.style.animationPlayState="running";
        }
        if(e.data?.__tw_done__){
          const ok=e.data.ok;
          lbl.textContent=ok?"\u2705 Task complete":"\u274c "+(e.data.label||"Stopped");
          lbl.style.color=ok?"#4ade80":"#f87171";dot.style.background=ok?"#4ade80":"#f87171";dot.style.animation="none";
          if(bar)bar.style.width=ok?"100%":bar.style.width;
          pau.style.display="none";con.style.display="none";stp.style.display="none";
          setTimeout(()=>{ov.style.opacity="0";ov.style.transition="opacity 0.5s";setTimeout(()=>ov.remove(),500);},3500);
        }
      });
    }});
  } catch(e){ console.warn("[TW overlay inject]",e.message); }
}

async function _pushOverlayStatus(tabId, label, done=false, ok=true) {
  if (!tabId) return;
  try {
    await chrome.scripting.executeScript({
      target:{ tabId },
      func:(l,d,o)=>{ if(d) window.postMessage({__tw_done__:true,label:l,ok:o},"*"); else window.postMessage({__tw_update__:true,label:l},"*"); },
      args:[label,done,ok]
    });
  } catch(_){}
}


// ── Call AI via dedicated extension-agent edge function ───────────────────────
// extension-agent is set up identically to browser-agent (the one that worked).
// Sends the same payload format and parses with _parseEdgeResponse.
async function _callAI(history, pageState) {
  const sess = await getSession();
  if (!sess) return { ok:false, error:"Not logged in" };

  const systemInstruction =
    "You are an expert browser automation agent.\n\n" +
    "SAFETY RULES - NEVER VIOLATE:\n" +
    "1. LOGIN/SIGNUP page: STOP. Reply: {\"reply\":\"MANUAL_TAKEOVER_REQUIRED - Login detected. Complete manually then Continue.\",\"actions\":[]}\n" +
    "2. PAYMENT/CHECKOUT page: STOP. Reply: {\"reply\":\"MANUAL_TAKEOVER_REQUIRED - Payment detected. Complete manually then Continue.\",\"actions\":[]}\n\n" +
    "Each turn respond with JSON only (no markdown, no extra text):\n" +
    "{\"reply\":\"what you are doing\",\"actions\":[{\"type\":\"click\",\"index\":0}]}\n\n" +
    "ACTION TYPES: click {index} | type {index, text} | press {key: Enter/Tab/Escape} | navigate {url} | scroll {direction: down/up} | wait {}\n" +
    "RULES: max 3 actions per turn | indices come from CURRENT element list each turn | dismiss cookie banners first\n" +
    "When fully done: {\"reply\":\"TASK_COMPLETED - summary\",\"actions\":[]}";

  const messages = [
    { role:"user",      content:systemInstruction },
    { role:"assistant", content:'{"reply":"Understood. I will follow these instructions exactly.","actions":[]}' },
    ...history.map(m => ({
      role:    m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    })),
    { role:"user", content:`Current page state:\n\n${pageState}\n\nRespond with JSON only.` },
  ];

  const urlMatch   = pageState.match(/^URL:\s*(.+)$/m);
  const titleMatch = pageState.match(/^Title:\s*(.+)$/m);

  const pageCtx = {
    url:          urlMatch?.[1]?.trim()  || "",
    title:        titleMatch?.[1]?.trim() || "",
    pageContent:  pageState,
    selectedText: "",
    formFields:   [],
    links:        [],
    systemPrompt: systemInstruction,
    agentMode:    true,
  };

  try {
    const r = await fetch(EP_EXT_AGENT, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "apikey":       SUPABASE_ANON_KEY,
        "Authorization":`Bearer ${sess.access_token}`,
      },
      body:JSON.stringify({
        messages:     messages.slice(-14),
        pageContext:  pageCtx,
        system:       systemInstruction,
        systemPrompt: systemInstruction,
      }),
    });

    if (r.status === 401) {
      await chrome.storage.local.remove("timewarp_session");
      return { ok:false, error:"Session expired — please log in again." };
    }

    const raw = await r.text();
    console.log("[TW AI] ext-agent status:", r.status, "raw:", raw.slice(0, 500));

    if (!r.ok) return { ok:false, error: _extractError(raw) || `Extension agent error ${r.status}` };

    return _parseEdgeResponse(raw);
  } catch(e) {
    console.error("[TW AI exception]", e);
    return { ok:false, error: e.message };
  }
}

// Parse the extension-agent response: { content: "<raw text from Claude>" }
// Handles error objects, plain JSON, and markdown-fenced JSON gracefully.
function _parseExtAgentResponse(raw) {
  if (!raw?.trim()) return { ok:false, error:"Empty response from extension agent" };

  const outer = _tryJson(raw);

  // Edge function returned an error object
  if (outer?.error) {
    console.error("[TW AI] extension-agent returned error:", outer.error);
    return { ok:false, error: String(outer.error) };
  }

  if (outer) {
    // Normal path: { content: "<Claude JSON string>" }
    if (typeof outer.content === "string" && outer.content.trim()) {
      const inner = _tryJson(outer.content);
      if (inner) {
        console.log("[TW AI] parsed ok:", JSON.stringify(inner).slice(0, 300));
        return _extractFromJson(inner, []);
      }
      // content is plain text (no JSON found inside) — treat as reply with no actions
      console.log("[TW AI] content is plain text, no actions:", outer.content.slice(0, 200));
      return { ok:true, reply: outer.content.trim(), actions:[] };
    }
    // outer itself is already the agent JSON
    if (outer.reply !== undefined || outer.actions !== undefined) {
      return _extractFromJson(outer, []);
    }
  }

  // Last resort: raw string might itself be the Claude JSON
  const direct = _tryJson(raw);
  if (direct?.reply !== undefined || direct?.actions !== undefined) {
    return _extractFromJson(direct, []);
  }

  console.error("[TW AI] unparseable ext-agent response:", raw.slice(0, 300));
  return { ok:false, error:"Could not parse extension agent response: " + raw.slice(0, 120) };
}

// Parse whatever the edge function returns into { ok, reply, actions }
function _parseEdgeResponse(raw) {
  if (!raw?.trim()) return { ok:false, error:"Empty response from edge function" };

  // ── SSE stream (data: lines) ──────────────────────────────────────────────
  if (raw.trimStart().startsWith("data:") || raw.includes("\ndata:")) {
    let prose = ""; const actions = [];
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const s = t.slice(5).trim();
      if (s === "[DONE]" || !s) continue;
      try {
        const c = JSON.parse(s);
        // OpenAI streaming delta
        if (c.choices?.[0]?.delta?.content)   { prose += c.choices[0].delta.content; continue; }
        if (c.choices?.[0]?.message?.content) { prose += c.choices[0].message.content; continue; }
        // Direct fields
        if (typeof c.reply   === "string") prose += c.reply;
        else if (typeof c.text    === "string") prose += c.text;
        else if (typeof c.content === "string") prose += c.content;
        if (Array.isArray(c.actions)) actions.push(...c.actions);
      } catch(_) {}
    }
    // The accumulated prose might itself be a JSON string
    const nested = _tryJson(prose);
    if (nested) return _extractFromJson(nested, actions);
    return { ok:true, reply:prose.trim(), actions };
  }

  // ── JSON body ─────────────────────────────────────────────────────────────
  const json = _tryJson(raw);
  if (json) return _extractFromJson(json, []);

  // ── Plain text fallback ───────────────────────────────────────────────────
  return { ok:true, reply:raw.trim(), actions:[] };
}

function _extractFromJson(json, fallbackActions) {
  const reply   = json.reply || json.response || json.content || json.message || json.text || json.answer || "";
  const actions = Array.isArray(json.actions) ? json.actions
                : Array.isArray(json.action)  ? json.action
                : fallbackActions;
  console.log("[TW AI] parsed: reply=", reply.slice(0,100), "actions=", JSON.stringify(actions).slice(0,200));
  return { ok:true, reply, actions };
}

// ── Execute one action ─────────────────────────────────────────────────────────
async function _execAction(tabId, action, elements) {
  const type = (action.type||"").toLowerCase();
  const text = action.text||action.value||"";
  const url  = action.url||"";
  const key  = action.key||"Enter";
  const dir  = action.direction||"down";

  // Resolve action.index → selector using the snapshot element list
  let sel = action.selector||action.target||"";
  let elText = action.elText||"";
  if (typeof action.index === "number" && elements) {
    const el = elements.find(e => e.i === action.index);
    if (el) {
      sel    = el.sel || sel;
      elText = el.txt || elText;
      console.log("[TW exec] index", action.index, "→ sel="+JSON.stringify(sel), "txt="+JSON.stringify(elText));
    } else {
      console.warn("[TW exec] index", action.index, "not found in elements (count:", elements.length, ")");
    }
  }

  // ── Navigate ──────────────────────────────────────────────────────────────
  if (type==="navigate"||type==="goto") {
    let dest = url||sel;
    if (!dest) return { success:false, error:"No URL for navigate" };
    if (!dest.startsWith("http")) dest = "https://" + dest;
    try {
      // Check we're not navigating to the same URL
      const cur = await chrome.tabs.get(tabId);
      if (cur.url===dest) return { success:false, error:"Already on this URL" };
      await chrome.tabs.update(tabId, { url:dest });
      // Wait for load
      await new Promise(resolve => {
        const fn = (id,info) => { if(id===tabId&&info.status==="complete"){chrome.tabs.onUpdated.removeListener(fn);resolve();} };
        chrome.tabs.onUpdated.addListener(fn);
        setTimeout(()=>{chrome.tabs.onUpdated.removeListener(fn);resolve();}, SETTLE_NAVIGATE);
      });
      await _sleep(500);
      return { success:true, result:`Navigated to ${dest}` };
    } catch(e) { return { success:false, error:e.message }; }
  }

  // ── Scroll ────────────────────────────────────────────────────────────────
  if (type==="scroll") {
    try {
      await chrome.scripting.executeScript({
        target:{tabId}, func:d=>{
          if (d==="up") window.scrollBy({top:-window.innerHeight*.8,behavior:"smooth"});
          else          window.scrollBy({top: window.innerHeight*.8,behavior:"smooth"});
        }, args:[dir]
      });
      await _sleep(400);
      return { success:true, result:`Scrolled ${dir}` };
    } catch(e) { return { success:false, error:e.message }; }
  }

  // ── Wait ──────────────────────────────────────────────────────────────────
  if (type==="wait") {
    await _sleep(Math.min(action.ms||2000,5000));
    return { success:true, result:"Waited" };
  }

  // ── DOM actions (click, type, press) via CDP ──────────────────────────────
  try {
    // Step 1: Find element and get its screen coordinates via content script
    const [coordRes] = await chrome.scripting.executeScript({
      target:{tabId},
      func:(sel, elText, actionType) => {
        function find(sel, hint) {
          if (sel) {
            try { const e=document.querySelector(sel); if(e) return e; } catch(_){}
          }
          if (hint) {
            const hintLow = hint.toLowerCase();
            for (const e of document.querySelectorAll("button,a,[role=button],[role=link],input,label")) {
              const t = (e.innerText||e.value||e.getAttribute("aria-label")||"").trim().toLowerCase();
              if (t && (t===hintLow||t.includes(hintLow)||hintLow.includes(t))) return e;
            }
          }
          if (sel) {
            for (const attr of ["aria-label","placeholder","name","title","data-testid"]) {
              try { const e=document.querySelector(`[${attr}="${sel.replace(/"/g,'\\"')}"]`); if(e) return e; } catch(_){}
            }
          }
          return null;
        }
        const el = find(sel, elText);
        if (!el) return { found:false, error:`Not found: "${elText||sel}"` };
        el.scrollIntoView({ block:"center", behavior:"instant" });
        const rect = el.getBoundingClientRect();
        if (rect.width===0||rect.height===0) return { found:false, error:"Element has no visible size" };
        if (actionType==="type"||actionType==="input") { el.focus(); }
        if (actionType==="press"||actionType==="key_press") { el.focus(); }
        const label = (el.innerText||el.value||el.getAttribute("aria-label")||sel||"").trim().slice(0,50);
        return { found:true, x:Math.round(rect.left+rect.width/2), y:Math.round(rect.top+rect.height/2), label, tag:el.tagName.toLowerCase() };
      },
      args:[sel, elText, type],
    });

    const coord = coordRes?.result;
    if (!coord?.found) return { success:false, error:coord?.error||"Element not found" };

    const dbgTarget = { tabId };

    if (type==="click") {
      await _cdpMouseMove(dbgTarget, coord.x, coord.y);
      await _sleep(40);
      await _cdpMouseClick(dbgTarget, coord.x, coord.y);
      await _sleep(100);
      return { success:true, result:`Clicked "${coord.label}"` };
    }

    if (type==="type"||type==="input") {
      // Click first to focus, then select all and replace
      await _cdpMouseClick(dbgTarget, coord.x, coord.y);
      await _sleep(150);
      // Select all existing text
      await _cdpKeyDown(dbgTarget, "a", 65, true); // Ctrl+A
      await _sleep(50);
      // Insert new text
      await chrome.debugger.sendCommand(dbgTarget, "Input.insertText", { text });
      await _sleep(50);
      return { success:true, result:`Typed "${text.slice(0,40)}" into "${coord.label}"` };
    }

    if (type==="press"||type==="key_press"||type==="keypress") {
      await _cdpKeyPress(dbgTarget, key);
      return { success:true, result:`Pressed ${key}` };
    }

    if (type==="hover") {
      await _cdpMouseMove(dbgTarget, coord.x, coord.y);
      return { success:true, result:`Hovered "${coord.label}"` };
    }

    return { success:false, error:`Unknown action type: "${type}"` };
  } catch(e) {
    console.error("[TW exec error]", e);
    return { success:false, error:e.message };
  }
}

// ── CDP helpers ───────────────────────────────────────────────────────────────
async function _cdpMouseMove(target, x, y) {
  await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { type:"mouseMoved", x, y });
}
async function _cdpMouseClick(target, x, y) {
  await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { type:"mousePressed", x, y, button:"left", clickCount:1 });
  await _sleep(30);
  await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { type:"mouseReleased", x, y, button:"left", clickCount:1 });
}
async function _cdpKeyPress(target, key) {
  const map = {
    "Enter":     { key:"Enter",     code:"Enter",     windowsVirtualKeyCode:13 },
    "Tab":       { key:"Tab",       code:"Tab",       windowsVirtualKeyCode:9  },
    "Escape":    { key:"Escape",    code:"Escape",    windowsVirtualKeyCode:27 },
    "Backspace": { key:"Backspace", code:"Backspace", windowsVirtualKeyCode:8  },
    "ArrowDown": { key:"ArrowDown", code:"ArrowDown", windowsVirtualKeyCode:40 },
    "ArrowUp":   { key:"ArrowUp",   code:"ArrowUp",   windowsVirtualKeyCode:38 },
    "Space":     { key:" ",         code:"Space",     windowsVirtualKeyCode:32 },
  };
  const k = map[key] || { key, code:key, windowsVirtualKeyCode:0 };
  await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { type:"keyDown", ...k });
  await _sleep(30);
  await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { type:"keyUp", ...k });
}
async function _cdpKeyDown(target, key, keyCode, ctrlKey=false) {
  const params = { type:"keyDown", key, code:`Key${key.toUpperCase()}`, windowsVirtualKeyCode:keyCode, modifiers:ctrlKey?2:0 };
  await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", params);
  await _sleep(30);
  await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { ...params, type:"keyUp" });
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function _sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }
function push(msg) { chrome.runtime.sendMessage(msg).catch(()=>{}); }

function _descAction(a) {
  const t=(a.type||"").toLowerCase();
  const IC={ click:"🖱️", type:"⌨️", navigate:"🌐", scroll:"📜", wait:"⏳", press:"↵", input:"⌨️" };
  const ic=IC[t]||"⚡";
  const el=a.elText||a.selector||"";
  if (t==="click")    return `${ic} Click — "${el.slice(0,40)}"`;
  if (t==="type"||t==="input") return `${ic} Type — "${(a.text||"").slice(0,40)}"`;
  if (t==="navigate") return `${ic} Navigate → ${(a.url||"").slice(0,50)}`;
  if (t==="scroll")   return `${ic} Scroll ${a.direction||"down"}`;
  if (t==="press")    return `${ic} Press ${a.key||"Enter"}`;
  return `${ic} ${t}`;
}

function _tryJson(s) {
  if (!s?.trim()) return null;
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(stripped); } catch(_){}
  try { return JSON.parse(s); } catch(_){}
  // Extract first {...} block
  const m = s.match(/\{[\s\S]*\}/);
  if (m) try { return JSON.parse(m[0]); } catch(_){}
  return null;
}

function _extractProse(raw) {
  if (!raw?.trim()) return "";
  raw = raw.replace(/^:\s*OPENROUTER PROCESSING\s*/i,"").trimStart();
  if (raw.startsWith("data:")||raw.includes("\ndata:")) {
    let out="";
    for (const line of raw.split("\n")) {
      const t=line.trim(); if(!t.startsWith("data:")) continue;
      const s=t.slice(5).trim(); if(s==="[DONE]"||!s) continue;
      try {
        const c=JSON.parse(s);
        if (c.choices?.[0]?.delta?.content)   { out+=c.choices[0].delta.content; continue; }
        if (c.choices?.[0]?.message?.content) { out+=c.choices[0].message.content; continue; }
        if (typeof c.reply==="string")         out+=c.reply;
        else if (typeof c.text==="string")     out+=c.text;
        else if (typeof c.content==="string")  out+=c.content;
      } catch(_){}
    }
    if (out.trim()) return _nukeProse(out);
  }
  const json=_tryJson(raw);
  if (json) return _nukeProse(json.reply||json.response||json.content||json.message||json.text||json.answer||"");
  return _nukeProse(raw);
}

function _nukeProse(text) {
  if (!text) return "";
  text=text.replace(/```json[\s\S]*?```/gi,"");
  text=text.replace(/```[\s\S]*?```/g,"");
  text=text.replace(/^\s*\{[^{}]*"(?:reply|response|content|message|actions|type|error)"\s*:[^{}]*\}\s*$/gm,"");
  text=text.replace(/\{[\s\S]{0,500}"actions"\s*:\s*\[[\s\S]*?\]\s*\}/g,"");
  text=text.replace(/^(?:NEXT_ACTION|ACTION|THOUGHT|PLAN|OBSERVATION)\s*:.*$/gim,"");
  return text.replace(/\n{3,}/g,"\n\n").trim();
}

function _pullSuggestions(text) {
  const suggestions=[];
  const reply=text.replace(/\[SUGGEST:(.*?)\]/gs,(_,inner)=>{ inner.split("|").forEach(s=>{ const t=s.trim(); if(t) suggestions.push(t); }); return ""; }).trim();
  return { reply, suggestions };
}

function _extractError(raw) {
  if (!raw) return null;
  try { const d=JSON.parse(raw); return d.error||d.message||d.msg||d.error_description||null; } catch(_){}
  return raw.slice(0,200);
}
