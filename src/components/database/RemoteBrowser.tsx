interface RemoteBrowserProps {
  liveViewUrl: string | null;
  onConnectionChange?: (connected: boolean) => void;
}

export function RemoteBrowser({ liveViewUrl, onConnectionChange }: RemoteBrowserProps) {
  if (!liveViewUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">Waiting for browser session...</p>
      </div>
    );
  }

  return (
    <iframe
      src={liveViewUrl}
      className="w-full h-full border-none"
      title="Remote Browser"
      allow="clipboard-read; clipboard-write"
      onLoad={() => onConnectionChange?.(true)}
    />
  );
}
