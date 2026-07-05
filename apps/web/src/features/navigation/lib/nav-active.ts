import type { ResolvedNavItem } from '@/features/navigation/types/universal-nav';

export type NavUrlItem = {
  url?: string;
  children?: NavUrlItem[];
};

function collectChildUrls(item: NavUrlItem): string[] {
  const urls: string[] = [];

  if (item.url) {
    urls.push(item.url);
  }

  for (const child of item.children ?? []) {
    urls.push(...collectChildUrls(child));
  }

  return urls;
}

export function isNavItemBranchActive(
  currentPathname: string,
  currentSearch: URLSearchParams,
  item: NavUrlItem,
): boolean {
  return collectChildUrls(item).some((url) =>
    isNavUrlActive(currentPathname, currentSearch, url),
  );
}

/** Pathname-only branch match — stable while search params update during navigation. */
export function isNavItemBranchOpenByPath(
  currentPathname: string,
  item: NavUrlItem,
): boolean {
  return collectChildUrls(item).some((url) => {
    const { pathname } = parseNavUrl(url);
    return currentPathname === pathname || currentPathname.startsWith(`${pathname}/`);
  });
}

export function isNavUrlActive(
  currentPathname: string,
  currentSearch: URLSearchParams,
  url: string,
): boolean {
  const { pathname, params } = parseNavUrl(url);
  const navParams = [...params.entries()];

  if (currentPathname !== pathname) {
    return false;
  }

  if (navParams.length === 0) {
    for (const key of NAV_DISCRIMINATOR_PARAMS) {
      if (currentSearch.has(key)) {
        return false;
      }
    }
    return true;
  }

  for (const [key, value] of navParams) {
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

/** Query keys that distinguish sibling nav items sharing the same pathname. */
const NAV_DISCRIMINATOR_PARAMS = ['status', 'tab', 'view'] as const;

export type { ResolvedNavItem };
