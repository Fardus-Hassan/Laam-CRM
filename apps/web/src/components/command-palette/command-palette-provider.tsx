'use client';

import * as React from 'react';

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  registerFocusHandler: (handler: (() => void) | null) => void;
};

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const focusHandlerRef = React.useRef<(() => void) | null>(null);

  const registerFocusHandler = React.useCallback((handler: (() => void) | null) => {
    focusHandlerRef.current = handler;
  }, []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      setOpen((current) => {
        const next = !current;
        if (next) {
          requestAnimationFrame(() => focusHandlerRef.current?.());
        }
        return next;
      });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen, registerFocusHandler }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}
