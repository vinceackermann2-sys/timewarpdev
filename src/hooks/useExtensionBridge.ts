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
      // Log ALL messages to debug extension communication
      if (event.data && typeof event.data === "object" && event.data.type) {
        console.log("[ExtBridge] Received message:", event.data.type, "source===window:", event.source === window, event.data);
      }

      // Accept messages from window OR from content scripts (some extensions post from different source)
      const { type } = event.data || {};

      if (type === "TIMEWARP_PONG") {
        console.log("[ExtBridge] ✅ PONG received! Extension connected.");
        setExtensionConnected(true);
        setDetecting(false);
      }

      if (type === "TIMEWARP_PAGE_CONTEXT") {
        const resolver = resolversRef.current.get("page_context");
        if (resolver) {
          resolver(event.data.payload as PageContext);
          resolversRef.current.delete("page_context");
        }
      }

      if (type === "TIMEWARP_ACTION_RESULT") {
        const resolver = resolversRef.current.get("action_result");
        if (resolver) {
          resolver(event.data.payload as ActionResult);
          resolversRef.current.delete("action_result");
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Ping the extension
    console.log("[ExtBridge] Sending TIMEWARP_PING...");
    window.postMessage({ type: "TIMEWARP_PING" }, "*");

    // Also try dispatching a custom DOM event as fallback
    window.dispatchEvent(new CustomEvent("TIMEWARP_PING"));

    // If no response within 3s, mark as not connected
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
    window.postMessage({ type: "TIMEWARP_PING" }, "*");
    setTimeout(() => setDetecting(false), 2000);
  }, []);

  const getPageContext = useCallback((): Promise<PageContext> => {
    return new Promise((resolve) => {
      resolversRef.current.set("page_context", resolve);
      window.postMessage({ type: "TIMEWARP_GET_PAGE_CONTEXT" }, "*");
      // Timeout fallback
      setTimeout(() => {
        if (resolversRef.current.has("page_context")) {
          resolversRef.current.delete("page_context");
          resolve({});
        }
      }, 3000);
    });
  }, []);

  const executeAction = useCallback((action: BrowserAction): Promise<ActionResult> => {
    return new Promise((resolve) => {
      resolversRef.current.set("action_result", resolve);
      window.postMessage({ type: "TIMEWARP_EXECUTE_ACTION", action }, "*");
      // Timeout fallback
      setTimeout(() => {
        if (resolversRef.current.has("action_result")) {
          resolversRef.current.delete("action_result");
          resolve({ success: false, action: action.action, error: "Timeout waiting for extension" });
        }
      }, 30000);
    });
  }, []);

  const signalStart = useCallback((employeeId: string) => {
    window.postMessage({ type: "TIMEWARP_EMPLOYEE_START", employeeId }, "*");
  }, []);

  const signalStop = useCallback((employeeId: string) => {
    window.postMessage({ type: "TIMEWARP_EMPLOYEE_STOP", employeeId }, "*");
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
