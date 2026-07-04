import { redirect } from 'next/navigation';

/** Canonical customers route is /dashboard/customers */
export default function CompaniesRedirectPage() {
  redirect('/dashboard/customers');
}
