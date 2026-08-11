'use client';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { QuickActionBar } from '@/features/quick-bar/components/quick-action-bar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="max-h-svh min-w-0 overflow-hidden">
        {/*
          Sole vertical scrollport (scrollbar flush to screen edge).
          [&>*]:min-w-0 keeps wide tables from expanding the page width.
        */}
        <div className="custom-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-y-contain pb-16 sm:pb-0 [&>*]:min-w-0">
          {children}
        </div>
        <QuickActionBar />
      </SidebarInset>
    </SidebarProvider>
  );
}
