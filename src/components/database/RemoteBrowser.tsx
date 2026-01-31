interface RemoteBrowserProps {
  userId: string;
  onConnectionChange?: (connected: boolean) => void;
}

export function RemoteBrowser({ userId, onConnectionChange }: RemoteBrowserProps) {
  return (
    <iframe
      src="http://46.225.19.131:8080"
      className="w-full h-full border-none"
      title="Remote Browser"
      onLoad={() => onConnectionChange?.(true)}
    />
  );
}
