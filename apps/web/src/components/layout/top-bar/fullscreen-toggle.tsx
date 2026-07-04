'use client';

import * as React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type FullscreenToggleProps = {
  className?: string;
};

export function FullscreenToggle({ className }: FullscreenToggleProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const onChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen denied or unsupported
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('size-9 shrink-0 rounded-lg border-border bg-card', className)}
      onClick={() => void toggleFullscreen()}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      aria-pressed={isFullscreen}
    >
      {isFullscreen ? (
        <Minimize2 className="size-4" />
      ) : (
        <Maximize2 className="size-4" />
      )}
    </Button>
  );
}
