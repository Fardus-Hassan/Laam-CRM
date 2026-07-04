export function createContactsListBreadcrumbs(activeLabel = 'Contacts') {
  return [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Contacts', href: '/dashboard/contacts' },
    { label: activeLabel },
  ];
}
