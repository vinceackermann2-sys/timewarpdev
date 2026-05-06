import { useState, useEffect, useCallback, useRef } from "react";

export interface PageContext {
  url?: string;
  title?: string;
  selectedText?: string;
  pageContent?: string;
  formFields?: any[];
  links?: any[];
  metadata?: Record<string, any>;
}

export interface BrowserAction {
  action: string;
  selector?: string;
  value?: string;
  url?: string;
  direction?: string;
  amount?: number;
  duration?: number;
  dataLabel?: string;
  text?: string;
  message?: string;
  reasoning?: string;
}

export interface ActionResult {
  success: boolean;
  action: string;
  error?: string;
  data?: any;
}

const TIMEWARP_EXTENSION_ID = "hcijmgkimmhiehjcnljaookjomhocjdd";

function sendDirectExtensionMessage<T = any>(message: Record<string, any>): Promise<T | null> {
  return new Promise((resolve) => {
    const runtime = (globalThis as any).chrome?.runtime;
    if (!runtime?.sendMessage) {
      resolve(null);
      return;
    }
    try {
      runtime.sendMessage(TIMEWARP_EXTENSION_ID, message, (response: T) => {
        if (runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

export function useExtensionBridge() {
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [detecting, setDetecting] = useState(true);
  const resolversRef = useRef<Map<string, (value: any) => void>>(new Map());
  const pendingGroupRequestRef = useRef<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data;

      // 🔍 DIAGNOSTIC: log anything that smells like the extension so we can
      // see exactly what protocol it speaks. Safe — only runs in browser.
      try {
        const asStr = typeof data === "string" ? data : JSON.stringify(data);
        if (asStr && /TIMEWARP|TW_|timewarp/i.test(asStr) && asStr.length < 500) {
          console.log("[ExtBridge] 📥 message:", data);
        }
      } catch {
        /* noop */
      }

      // Accept multiple connection-confirmation shapes so we work with any
      // version of the extension protocol.
      const stringPongs = new Set([
        "TIMEWARP_PONG",
        "TW_PONG",
        "PONG",
        "TIMEWARP_EXTENSION_READY",
        "TIMEWARP_READY",
      ]);
      const objectPongTypes = new Set([
        "TIMEWARP_PONG",
        "TW_PONG",
        "PONG",
        "TIMEWARP_EXTENSION_READY",
        "TIMEWARP_READY",
        "TIMEWARP_HELLO",
        "TIMEWARP_CONNECTED",
        "TIMEWARP_INIT",
      ]);

      if (typeof data === "string" && stringPongs.has(data)) {
        console.log("[ExtBridge] ✅ PONG (string):", data);
        setExtensionConnected(true);
        setDetecting(false);
        return;
      }

      if (typeof data === "object" && data !== null) {
        const { type, source } = data as { type?: string; source?: string };

        // Only trust messages from the extension itself. The app uses
        // source: "timewarp-app" for outbound pings — do NOT treat those
        // as proof that the extension is present.
        const isExtensionSource = typeof source === "string" && /timewarp-(extension|ext|background|content)/i.test(source);
        if (isExtensionSource && !stringPongs.has(type ?? "")) {
          console.log("[ExtBridge] ✅ Extension source detected:", source);
          setExtensionConnected(true);
          setDetecting(false);
        }

        if (type && objectPongTypes.has(type)) {
          console.log("[ExtBridge] ✅ PONG (object):", type);
          setExtensionConnected(true);
          setDetecting(false);
        }

        if (type === "TIMEWARP_PAGE_CONTEXT") {
          // Receiving any real payload also implies the extension is here.
          setExtensionConnected(true);
          setDetecting(false);
          const resolver = resolversRef.current.get("page_context");
          if (resolver) {
            resolver(data.payload as PageContext);
            resolversRef.current.delete("page_context");
          }
        }

        if (type === "TIMEWARP_ACTION_RESULT") {
          setExtensionConnected(true);
          setDetecting(false);
          const resolver = resolversRef.current.get("action_result");
          if (resolver) {
            resolver(data.payload as ActionResult);
            resolversRef.current.delete("action_result");
          }
        }

        if (type === "TIMEWARP_GROUP_READY") {
          const payload = (data as { payload?: { success?: boolean; error?: string; requestId?: string }; requestId?: string }).payload;
          const requestId = (data as { requestId?: string }).requestId || payload?.requestId;
          if (pendingGroupRequestRef.current && requestId && requestId !== pendingGroupRequestRef.current) return;
          console.log("[ExtBridge] ✅ Tab group ready:", payload);
          setExtensionConnected(true);
          setDetecting(false);
          const resolver = resolversRef.current.get("group_ready");
          if (resolver) {
            resolver(payload?.success === true);
            resolversRef.current.delete("group_ready");
            pendingGroupRequestRef.current = null;
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Check sync markers the extension may have set on the page already
    // (covers the case where the content script ran before React mounted).
    try {
      const w = window as unknown as Record<string, unknown>;
      if (
        w.__TIMEWARP_EXTENSION__ === true ||
        w.__TIMEWARP__ === true ||
        w.timewarpExtension === true ||
        document.documentElement.hasAttribute("data-timewarp-extension")
      ) {
        console.log("[ExtBridge] ✅ Extension marker detected on window/dom.");
        setExtensionConnected(true);
        setDetecting(false);
      }
    } catch {
      /* noop */
    }

    const sendPing = () => {
      // Cover every reasonable shape the extension's content script might listen for.
      const variants: Array<unknown> = [
        "TIMEWARP_PING",
        "TW_PING",
        "PING",
        { type: "TIMEWARP_PING" },
        { type: "TW_PING" },
        { type: "PING", source: "timewarp-app" },
        { source: "timewarp-app", type: "TIMEWARP_PING" },
      ];
      for (const v of variants) {
        try {
          window.postMessage(v, "*");
        } catch {
          /* noop */
        }
      }
    };

    void sendDirectExtensionMessage<{ type?: string; source?: string }>({ type: "TIMEWARP_PING" }).then((response) => {
      if (response?.type === "TIMEWARP_PONG") {
        console.log("[ExtBridge] ✅ Direct extension connection detected.");
        setExtensionConnected(true);
        setDetecting(false);
      }
    });

    // Ping repeatedly with backoff so we don't miss the extension's listener
    // if it loads slightly after this hook mounts.
    const pingDelays = [0, 150, 400, 900, 1600, 2500, 4000];
    const pingTimers = pingDelays.map((d) =>
      setTimeout(() => {
        console.debug(`[ExtBridge] Sending PING variants (t+${d}ms)...`);
        sendPing();
      }, d),
    );

    const timeout = setTimeout(() => {
      console.debug("[ExtBridge] Detection timeout — extension not detected (expected if not installed)");
      setDetecting(false);
    }, 5000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeout);
      pingTimers.forEach(clearTimeout);
    };
  }, []);

  const retryDetection = useCallback(() => {
    setDetecting(true);
    const variants: Array<unknown> = [
      "TIMEWARP_PING",
      "TW_PING",
      "PING",
      { type: "TIMEWARP_PING" },
      { type: "TW_PING" },
      { source: "timewarp-app", type: "TIMEWARP_PING" },
    ];
    const fire = () => variants.forEach((v) => window.postMessage(v, "*"));
    fire();
    setTimeout(fire, 300);
    setTimeout(fire, 800);
    setTimeout(() => setDetecting(false), 2500);
  }, []);

  const getPageContext = useCallback((): Promise<PageContext | null> => {
    return new Promise((resolve) => {
      resolversRef.current.set("page_context", resolve as (v: any) => void);
      window.postMessage({ type: "TIMEWARP_GET_PAGE_CONTEXT", targetGroupTab: true }, "*");
      setTimeout(() => {
        if (resolversRef.current.has("page_context")) {
          // Retry once before failing; page scraping can be slightly delayed.
          window.postMessage({ type: "TIMEWARP_GET_PAGE_CONTEXT", targetGroupTab: true }, "*");
          setTimeout(() => {
            if (resolversRef.current.has("page_context")) {
              resolversRef.current.delete("page_context");
              resolve(null);
            }
          }, 2500);
        }
      }, 2500);
    });
  }, []);

  const executeAction = useCallback((action: BrowserAction, executeInTab = true): Promise<ActionResult> => {
    return new Promise((resolve) => {
      resolversRef.current.set("action_result", resolve);
      const msg = { type: "TIMEWARP_EXECUTE_ACTION", action, executeInTab, targetGroupTab: true, focusGroup: false };
      console.log("[ExtBridge] 📤 Sending action:", JSON.stringify(msg));
      window.postMessage(msg, "*");
      setTimeout(() => {
        if (resolversRef.current.has("action_result")) {
          // Retry once before failing to reduce false timeout failures.
          window.postMessage(msg, "*");
          setTimeout(() => {
            if (resolversRef.current.has("action_result")) {
              resolversRef.current.delete("action_result");
              resolve({ success: false, action: action.action, error: "Timeout waiting for extension after retry" });
            }
          }, 15000);
        }
      }, 15000);
    });
  }, []);

  const signalStart = useCallback((employeeId: string, employeeName: string, opts?: { startUrl?: string; focusGroup?: boolean }): Promise<boolean> => {
    return new Promise((resolve) => {
      resolversRef.current.set("group_ready", resolve);
      const requestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      pendingGroupRequestRef.current = requestId;
      // Send multiple shapes so older/newer extension builds all create the
      // grouped tab. Pass an explicit startUrl (about:blank by default) so the
      // extension actually opens a new tab inside the group.
      const startUrl = opts?.startUrl || "https://www.google.com";
      const focusGroup = opts?.focusGroup ?? true;
      const payload = {
        type: "TIMEWARP_EMPLOYEE_START",
        employeeId,
        employeeName,
        useTabGroup: true,
        openTab: true,
        createNewTab: true,
        startUrl,
        url: startUrl,
        focusGroup,
        requestId,
      };
      window.postMessage(payload, "*");
      // Fallback: resolve after 5s even if extension doesn't confirm
      setTimeout(() => {
        if (resolversRef.current.has("group_ready")) {
          console.log("[ExtBridge] ⏰ Group ready timeout - proceeding anyway");
          resolversRef.current.delete("group_ready");
          pendingGroupRequestRef.current = null;
          resolve(false);
        }
      }, 5000);
    });
  }, []);

  const signalStop = useCallback((employeeId: string) => {
    window.postMessage({ type: "TIMEWARP_EMPLOYEE_STOP", employeeId, closeTabGroup: true }, "*");
  }, []);

  /**
   * Hard-cancel any in-flight extension promises (page_context, action_result,
   * group_ready) by resolving them immediately with a "cancelled" shape so the
   * calling loop can break out instantly instead of waiting for timeouts.
   */
  const cancelPending = useCallback(() => {
    const pageResolver = resolversRef.current.get("page_context");
    if (pageResolver) {
      resolversRef.current.delete("page_context");
      pageResolver({});
    }
    const actionResolver = resolversRef.current.get("action_result");
    if (actionResolver) {
      resolversRef.current.delete("action_result");
      actionResolver({ success: false, action: "cancel", error: "Cancelled" });
    }
    const groupResolver = resolversRef.current.get("group_ready");
    if (groupResolver) {
      resolversRef.current.delete("group_ready");
      pendingGroupRequestRef.current = null;
      groupResolver(false);
    }
  }, []);

  const updateOverlay = useCallback((state: {
    visible: boolean;
    employeeName?: string;
    currentStep?: string;
    isPaused?: boolean;
    isManualMode?: boolean;
    safetyAlert?: string | null;
  }) => {
    window.postMessage({ type: "TIMEWARP_OVERLAY_UPDATE", targetGroupTab: true, ...state }, "*");
  }, []);

  return {
    extensionConnected,
    detecting,
    retryDetection,
    getPageContext,
    executeAction,
    signalStart,
    signalStop,
    updateOverlay,
    cancelPending,
  };
}
