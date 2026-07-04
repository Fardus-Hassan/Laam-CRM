import type { ResolvedNavItem } from '@/features/navigation/types/universal-nav';

export type NavUrlItem = {
  url?: string;
  children?: { url: string }[];
};

export function isNavItemBranchActive(
  currentPathname: string,
  currentSearch: URLSearchParams,
  item: NavUrlItem,
): boolean {
  if (item.url && isNavUrlActive(currentPathname, currentSearch, item.url)) {
    return true;
  }

  return (
    item.children?.some((child) =>
      isNavUrlActive(currentPathname, currentSearch, child.url),
    ) ?? false
  );
}

export function isNavUrlActive(
  currentPathname: string,
  currentSearch: URLSearchParams,
  url: string,
): boolean {
  const { pathname, params } = parseNavUrl(url);

  const pathMatches =
    currentPathname === pathname ||
    (pathname !== '/dashboard' && currentPathname.startsWith(`${pathname}/`));

  if (!pathMatches) {
    return false;
  }

  if ([...params.keys()].length === 0) {
    return currentPathname === pathname;
  }

  for (const [key, value] of params.entries()) {
    if (currentSearch.get(key) !== value) {
      return false;
    }
  }

  return true;
}

function parseNavUrl(url: string) {
  const [pathname, search] = url.split('?');
  const params = new URLSearchParams(search ?? '');

  return { pathname, params };
}

export type { ResolvedNavItem };
