import { useEffect, useRef, useState } from 'react';
import { Loader2, MousePointer, Wifi, WifiOff } from 'lucide-react';

interface RemoteBrowserProps {
  userId: string;
  onConnectionChange?: (connected: boolean) => void;
}

export function RemoteBrowser({ userId, onConnectionChange }: RemoteBrowserProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastClick, setLastClick] = useState<{ x: number; y: number } | null>(null);
  const [frameCount, setFrameCount] = useState(0);

  useEffect(() => {
    const ws = new WebSocket(`wss://browser.timewarpdev.com/?userId=${userId}`);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      console.log("[RemoteBrowser] WebSocket connected");
      setIsConnected(true);
      setIsLoading(false);
      onConnectionChange?.(true);
    };

    ws.onmessage = (event) => {
      const blob = new Blob([event.data], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      if (imgRef.current) {
        // Revoke previous URL to prevent memory leaks
        if (imgRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(imgRef.current.src);
        }
        imgRef.current.src = url;
      }
      setFrameCount(prev => prev + 1);
    };

    ws.onerror = (error) => {
      console.error("[RemoteBrowser] WebSocket error:", error);
      setIsConnected(false);
      setIsLoading(false);
      onConnectionChange?.(false);
    };

    ws.onclose = () => {
      console.log("[RemoteBrowser] WebSocket closed");
      setIsConnected(false);
      onConnectionChange?.(false);
    };

    return () => {
      ws.close();
      // Cleanup blob URL on unmount
      if (imgRef.current?.src.startsWith('blob:')) {
        URL.revokeObjectURL(imgRef.current.src);
      }
    };
  }, [userId, onConnectionChange]);

  const sendAction = async (type: string, payload: Record<string, unknown>) => {
    try {
      await fetch("https://browser.timewarpdev.com/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type, payload })
      });
    } catch (error) {
      console.error("[RemoteBrowser] Failed to send action:", error);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isConnected) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    // Scale from display size (800x450) to actual browser size (1280x720)
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1280);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 720);
    
    setLastClick({ x, y });
    sendAction("click", { x, y });
    
    // Clear click indicator after animation
    setTimeout(() => setLastClick(null), 500);
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Connection status bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-card/50 border-b border-border/50">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-primary" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={`text-xs font-medium ${isConnected ? 'text-primary' : 'text-muted-foreground'}`}>
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
        {isConnected && (
          <span className="text-xs text-muted-foreground">
            {frameCount} frames
          </span>
        )}
      </div>

      {/* Browser viewport */}
      <div 
        className="relative flex-1 bg-muted/20 cursor-crosshair overflow-hidden"
        onClick={handleClick}
        style={{ aspectRatio: '16/9' }}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Connecting to browser...</p>
            </div>
          </div>
        ) : !isConnected ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <WifiOff className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Connection lost</p>
            </div>
          </div>
        ) : null}

        <img 
          ref={imgRef} 
          alt="Remote browser view"
          className="w-full h-full object-contain"
          style={{ display: isConnected ? 'block' : 'none' }}
        />

        {/* Click indicator */}
        {lastClick && (
          <div 
            className="absolute pointer-events-none"
            style={{
              left: `${(lastClick.x / 1280) * 100}%`,
              top: `${(lastClick.y / 720) * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              <MousePointer className="h-5 w-5 text-primary animate-ping" />
              <div className="absolute inset-0 h-8 w-8 -m-1.5 rounded-full bg-primary/20 animate-ping" />
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {isConnected && (
        <div className="px-3 py-2 bg-card/30 border-t border-border/50">
          <p className="text-xs text-center text-muted-foreground">
            🖱️ Click anywhere to interact with the browser
          </p>
        </div>
      )}
    </div>
  );
}
