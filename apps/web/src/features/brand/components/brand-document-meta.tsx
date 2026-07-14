'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { DEFAULT_BRAND } from '@/config/brand';
import { useBrand } from '@/features/brand/providers/brand-provider';

const BRAND_ICON_ATTR = 'data-laam-brand-icon';
const TITLE_STORAGE_PREFIX = 'laam_doc_title:';

export function brandTitleStorageKey(hostname = window.location.hostname) {
  return `${TITLE_STORAGE_PREFIX}${hostname}`;
}

/** Cache title so the next full reload can paint the right tab name before React boots. */
export function cacheBrandDocumentTitle(name: string) {
  if (typeof window === 'undefined' || !name.trim()) {
    return;
  }
  try {
    sessionStorage.setItem(brandTitleStorageKey(), name.trim());
  } catch {
    // Private mode / blocked storage — ignore.
  }
}

function resolveFaviconHref(brand: {
  logos: { favicon?: string; light?: string };
}): string {
  return (
    brand.logos.favicon?.trim() ||
    brand.logos.light?.trim() ||
    DEFAULT_BRAND.logos.favicon
  );
}

/** Upsert a single branded icon link without deleting Next’s other head nodes mid-nav. */
function upsertBrandIconLink(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(
    `link[${BRAND_ICON_ATTR}='1'][rel='${rel}']`,
  );
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    link.setAttribute(BRAND_ICON_ATTR, '1');
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href);
  }
}

function applyBrandDocumentMeta(brand: {
  name: string;
  logos: { favicon?: string; light?: string };
}) {
  const name = brand.name?.trim();
  if (name) {
    if (document.title !== name) {
      document.title = name;
    }
    cacheBrandDocumentTitle(name);
  }

  const href = resolveFaviconHref(brand);
  upsertBrandIconLink('icon', href);
  upsertBrandIconLink('shortcut icon', href);
  upsertBrandIconLink('apple-touch-icon', href);
}

/**
 * Keeps tab title + favicon in sync with the active brand.
 * Intentionally does NOT MutationObserver-fight Next soft-nav head updates —
 * that used to abort client transitions (double-click / hard reload).
 */
export function BrandDocumentMeta() {
  const brand = useBrand();
  const pathname = usePathname();
  const name = brand.name;
  const favicon = brand.logos.favicon;
  const light = brand.logos.light;

  // Before paint when brand identity changes.
  React.useLayoutEffect(() => {
    applyBrandDocumentMeta(brand);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on stable brand fields + route
  }, [name, favicon, light]);

  // After soft nav completes, restore company title once (Next may have set metadata default).
  React.useEffect(() => {
    applyBrandDocumentMeta(brand);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathname + brand fields
  }, [pathname, name, favicon, light]);

  return null;
}
