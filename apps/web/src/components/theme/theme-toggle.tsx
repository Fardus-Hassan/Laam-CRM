'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/features/theme/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('size-9 shrink-0 rounded-lg border-border bg-card', className)}
      onClick={toggleTheme}
      disabled={!mounted}
      aria-label={mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Theme toggle'}
    >
      {mounted && isDark ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}
