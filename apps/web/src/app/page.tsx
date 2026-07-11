import { redirect } from 'next/navigation';

import { siteConfig } from '@/config/site';

export default function HomePage() {
  if (process.env.NEXT_PUBLIC_USE_API === 'true') {
    redirect('/login');
  }

  redirect(siteConfig.defaultRoute);
}
