'use client';

import * as React from 'react';
import { Maximize2, Minimize2, Moon, MoreHorizontal, RefreshCw, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/features/theme/hooks/use-theme';
import { requestPageDataRefresh } from '@/lib/page-data-refresh';
import { cn } from '@/lib/utils';

const iconBtnClass =
  'size-8 shrink-0 rounded-lg border-border/70 bg-card/80 sm:size-9';

export function TopBarMobileMore({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function handleRefresh() {
    if (busy) return;
    setBusy(true);
    requestPageDataRefresh();
    window.setTimeout(() => setBusy(false), 900);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
    } catch {
      // denied or unsupported
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(iconBtnClass, className)}
          aria-label="More actions"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={handleRefresh} disabled={busy}>
          <RefreshCw className={cn('size-4', busy && 'animate-spin')} />
          Refresh page
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void toggleFullscreen()}>
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={toggleTheme} disabled={!mounted}>
          {mounted && isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {mounted && isDark ? 'Light mode' : 'Dark mode'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
