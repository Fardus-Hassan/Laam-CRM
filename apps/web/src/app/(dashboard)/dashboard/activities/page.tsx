import { redirect } from 'next/navigation';

/** Activities merged into Follow-ups — keep route for old bookmarks. */
export default function ActivitiesPage() {
  redirect('/dashboard/followups');
}
