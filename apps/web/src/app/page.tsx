import { redirect } from 'next/navigation';
import { siteConfig } from '@/config/site';

export default function HomePage() {
  redirect(siteConfig.defaultRoute);
}
