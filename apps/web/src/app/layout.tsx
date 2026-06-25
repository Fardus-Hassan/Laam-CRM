import './global.css';

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
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
