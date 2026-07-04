export const imageAssets = {
  brand: {
    logo: '/images/brand/logo.png',
  },
  icons: {
    orgMark: '/images/icons/org-mark.svg',
  },
  ui: {
    dashboardHero: '/images/ui/dashboard-hero.png',
  },
} as const;

export type ImageAssetPath =
  (typeof imageAssets)[keyof typeof imageAssets][keyof (typeof imageAssets)[keyof typeof imageAssets]];
