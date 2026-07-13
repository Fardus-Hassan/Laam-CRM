import './global.css';

import { AppProviders } from '@/components/providers/app-providers';

export const metadata = {
  title: 'Laam CRM',
  description: 'Laam enterprise SaaS CRM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
