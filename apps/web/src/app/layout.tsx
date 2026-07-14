import './global.css';

import { AppProviders } from '@/components/providers/app-providers';

export const metadata = {
  title: {
    // Neutral until BrandDocumentMeta / cached title takes over.
    // Avoid sticking "Laam CRM" after soft-nav + reload races.
    default: 'Laam',
    template: '%s',
  },
  description: 'Laam enterprise SaaS CRM',
  // First paint before BrandDocumentMeta runs — never the Next.js default icon.
  icons: {
    icon: [{ url: '/images/brand/logo.png', type: 'image/png' }],
    shortcut: '/images/brand/logo.png',
    apple: '/images/brand/logo.png',
  },
};

/** Applies last-known company title before React hydrates (reload flash). */
const BRAND_TITLE_BOOT_SCRIPT = `(function(){try{var t=sessionStorage.getItem('laam_doc_title:'+location.hostname);if(t)document.title=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BRAND_TITLE_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
