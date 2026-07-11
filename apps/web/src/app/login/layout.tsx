import { AppProviders } from '@/components/providers/app-providers';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
