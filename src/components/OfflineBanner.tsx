import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>
        You are currently offline. App interface and local browser voice tools remain available, while internet-dependent AI voice generation requires an active connection.
      </span>
    </div>
  );
};
