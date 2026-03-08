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

export function useExtensionBridge() {
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [detecting, setDetecting] = useState(true);
  const resolversRef = useRef<Map<string, (value: any) => void>>(new Map());

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data;

      if (data === "TIMEWARP_PONG") {
        console.log("[ExtBridge] ✅ PONG received! Extension connected.");
        setExtensionConnected(true);
        setDetecting(false);
        return;
      }

      if (typeof data === "object" && data !== null) {
        const { type } = data;

        if (type === "TIMEWARP_PONG") {
          console.log("[ExtBridge] ✅ PONG received (object)! Extension connected.");
          setExtensionConnected(true);
          setDetecting(false);
        }

        if (type === "TIMEWARP_PAGE_CONTEXT") {
          const resolver = resolversRef.current.get("page_context");
          if (resolver) {
            resolver(data.payload as PageContext);
            resolversRef.current.delete("page_context");
          }
        }

        if (type === "TIMEWARP_ACTION_RESULT") {
          const resolver = resolversRef.current.get("action_result");
          if (resolver) {
            resolver(data.payload as ActionResult);
            resolversRef.current.delete("action_result");
          }
        }

        if (type === "TIMEWARP_GROUP_READY") {
          console.log("[ExtBridge] ✅ Tab group ready.");
          const resolver = resolversRef.current.get("group_ready");
          if (resolver) {
            resolver(true);
            resolversRef.current.delete("group_ready");
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);

    console.log("[ExtBridge] Sending TIMEWARP_PING...");
    window.postMessage("TIMEWARP_PING", "*");

    const timeout = setTimeout(() => {
      console.log("[ExtBridge] ⏰ Detection timeout - no PONG received");
      setDetecting(false);
    }, 3000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  const retryDetection = useCallback(() => {
    setDetecting(true);
    setExtensionConnected(false);
    window.postMessage("TIMEWARP_PING", "*");
    setTimeout(() => setDetecting(false), 3000);
  }, []);

  const getPageContext = useCallback((): Promise<PageContext> => {
    return new Promise((resolve) => {
      resolversRef.current.set("page_context", resolve);
      window.postMessage({ type: "TIMEWARP_GET_PAGE_CONTEXT", targetGroupTab: true }, "*");
      setTimeout(() => {
        if (resolversRef.current.has("page_context")) {
          resolversRef.current.delete("page_context");
          resolve({});
        }
      }, 3000);
    });
  }, []);

  const executeAction = useCallback((action: BrowserAction, executeInTab = true): Promise<ActionResult> => {
    return new Promise((resolve) => {
      resolversRef.current.set("action_result", resolve);
      window.postMessage({ type: "TIMEWARP_EXECUTE_ACTION", action, executeInTab, targetGroupTab: true }, "*");
      setTimeout(() => {
        if (resolversRef.current.has("action_result")) {
          resolversRef.current.delete("action_result");
          resolve({ success: false, action: action.action, error: "Timeout waiting for extension" });
        }
      }, 30000);
    });
  }, []);

  const signalStart = useCallback((employeeId: string, employeeName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolversRef.current.set("group_ready", resolve);
      window.postMessage({
        type: "TIMEWARP_EMPLOYEE_START",
        employeeId,
        employeeName,
        useTabGroup: true,
        openTab: true,
        focusGroup: false,
      }, "*");
      // Fallback: resolve after 3s even if extension doesn't confirm
      setTimeout(() => {
        if (resolversRef.current.has("group_ready")) {
          console.log("[ExtBridge] ⏰ Group ready timeout - proceeding anyway");
          resolversRef.current.delete("group_ready");
          resolve(false);
        }
      }, 3000);
    });
  }, []);

  const signalStop = useCallback((employeeId: string) => {
    window.postMessage({ type: "TIMEWARP_EMPLOYEE_STOP", employeeId, closeTabGroup: true }, "*");
  }, []);

  return {
    extensionConnected,
    detecting,
    retryDetection,
    getPageContext,
    executeAction,
    signalStart,
    signalStop,
  };
}
