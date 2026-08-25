import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BrandColors,
  OrganizationBranding,
  PublicTenantBrand,
  UpdateOrganizationBranding,
} from '@laam/types';
import { normalizeBrandColorInput } from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

export const DEFAULT_BRAND_COLORS: BrandColors = {
  primary: '#127A3B',
  primaryDark: '#0B4D2A',
  accent: '#FFD700',
  sidebarBgLight: '#FFFFFF',
  sidebarBgDark: '#0B4D2A',
  sidebarActiveBg: '#8CC63F',
  sidebarActiveFg: '#FFFFFF',
  sidebarFg: '#F6F9F6',
  surfaceLight: '#F6F9F6',
  surfaceDark: '#1E1E1E',
};

const DEFAULT_LOGOS = {
  light: '/images/brand/white-mode-logo.png',
  dark: '/images/brand/logo.png',
  favicon: '/images/brand/logo.png',
};

type UploadedLogo = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

function asBranding(value: unknown): OrganizationBranding {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const raw = value as OrganizationBranding;
  const logos = raw.logos
    ? {
        ...(raw.logos.light?.trim() ? { light: raw.logos.light.trim() } : {}),
        ...(raw.logos.dark?.trim() ? { dark: raw.logos.dark.trim() } : {}),
        ...(raw.logos.favicon?.trim() ? { favicon: raw.logos.favicon.trim() } : {}),
      }
    : undefined;

  let sidebarNavOrder = raw.sidebarNavOrder ?? undefined;
  if (
    sidebarNavOrder &&
    (!Array.isArray(sidebarNavOrder.groupIds) ||
      typeof sidebarNavOrder.itemIdsByGroup !== 'object' ||
      sidebarNavOrder.itemIdsByGroup === null)
  ) {
    sidebarNavOrder = undefined;
  }

  let sidebarNavLayout = raw.sidebarNavLayout ?? undefined;
  if (
    sidebarNavLayout &&
    (sidebarNavLayout.version !== 1 ||
      !Array.isArray(sidebarNavLayout.sections) ||
      !Array.isArray(sidebarNavLayout.folders) ||
      typeof sidebarNavLayout.childrenByFolderId !== 'object' ||
      sidebarNavLayout.childrenByFolderId === null)
  ) {
    sidebarNavLayout = undefined;
  }

  return {
    colors: normalizeBrandColorInput(raw.colors) ?? raw.colors,
    logos: logos && Object.keys(logos).length > 0 ? logos : undefined,
    ...(sidebarNavOrder ? { sidebarNavOrder } : {}),
    ...(sidebarNavLayout ? { sidebarNavLayout } : {}),
  };
}

function mergeColors(partial?: Partial<BrandColors> | null): BrandColors {
  return {
    ...DEFAULT_BRAND_COLORS,
    ...(normalizeBrandColorInput(partial) ?? partial ?? {}),
  };
}

@Injectable()
export class BrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  resolvePublicBrand(input: {
    name: string;
    slug: string;
    branding: unknown;
  }): PublicTenantBrand {
    const branding = asBranding(input.branding);
    return {
      name: input.name,
      slug: input.slug,
      colors: mergeColors(branding.colors),
      logos: {
        light: branding.logos?.light || (input.slug === 'platform' ? DEFAULT_LOGOS.light : undefined),
        dark: branding.logos?.dark || (input.slug === 'platform' ? DEFAULT_LOGOS.dark : undefined),
        favicon: branding.logos?.favicon || (input.slug === 'platform' ? DEFAULT_LOGOS.favicon : undefined),
      },
    };
  }

  async getPublicBySlug(slug: string): Promise<PublicTenantBrand> {
    const row = await this.prisma.organization.findUnique({
      where: { slug: slug.trim().toLowerCase() },
    });
    if (!row || row.slug === 'platform') {
      throw new NotFoundException('Tenant not found');
    }
    if (row.status === 'suspended') {
      throw new ForbiddenException({
        code: 'ORG_SUSPENDED',
        message: 'This company account is suspended',
      });
    }

    return this.resolvePublicBrand({
      name: row.name,
      slug: row.slug,
      branding: row.branding,
    });
  }

  async getForOrganization(organizationId: string): Promise<PublicTenantBrand> {
    const row = await this.prisma.organization.findFirst({
      where: { id: organizationId },
    });
    if (!row) {
      throw new NotFoundException('Organization not found');
    }
    const branding = asBranding(row.branding);
    return {
      ...this.resolvePublicBrand({
        name: row.name,
        slug: row.slug,
        branding: row.branding,
      }),
      ...(branding.sidebarNavOrder
        ? { sidebarNavOrder: branding.sidebarNavOrder }
        : {}),
      ...(branding.sidebarNavLayout
        ? { sidebarNavLayout: branding.sidebarNavLayout }
        : {}),
    };
  }

  async getPlatformBrand(): Promise<PublicTenantBrand> {
    const row = await this.prisma.organization.findUnique({
      where: { slug: 'platform' },
    });
    if (!row) {
      throw new NotFoundException('Platform organization not found');
    }
    const branding = asBranding(row.branding);
    return {
      ...this.resolvePublicBrand({
        name: row.name || 'Laam',
        slug: 'platform',
        branding: row.branding,
      }),
      ...(branding.sidebarNavOrder
        ? { sidebarNavOrder: branding.sidebarNavOrder }
        : {}),
      ...(branding.sidebarNavLayout
        ? { sidebarNavLayout: branding.sidebarNavLayout }
        : {}),
    };
  }

  async getPlatformOrganizationId(): Promise<string> {
    const row = await this.prisma.organization.findUnique({
      where: { slug: 'platform' },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Platform organization not found');
    }
    return row.id;
  }

  async updateBranding(
    organizationId: string,
    patch: UpdateOrganizationBranding,
  ): Promise<PublicTenantBrand> {
    const row = await this.prisma.organization.findFirst({
      where: { id: organizationId },
    });
    if (!row) {
      throw new NotFoundException('Organization not found');
    }

    const current = asBranding(row.branding);
    const nextLogos = {
      ...current.logos,
      ...patch.logos,
    };
    if (patch.logos?.light === '') {
      delete nextLogos.light;
    }
    if (patch.logos?.dark === '') {
      delete nextLogos.dark;
    }
    if (patch.logos?.favicon === '') {
      delete nextLogos.favicon;
    }

    const next: OrganizationBranding = {
      colors: {
        ...current.colors,
        ...patch.colors,
      },
      logos: nextLogos,
    };

    if (patch.sidebarNavOrder === null) {
      // cleared — leave undefined
    } else if (patch.sidebarNavOrder !== undefined) {
      next.sidebarNavOrder = patch.sidebarNavOrder;
    } else if (current.sidebarNavOrder) {
      next.sidebarNavOrder = current.sidebarNavOrder;
    }

    if (patch.sidebarNavLayout === null) {
      // cleared — leave undefined (client falls back to PDF default)
    } else if (patch.sidebarNavLayout !== undefined) {
      next.sidebarNavLayout = patch.sidebarNavLayout;
    } else if (current.sidebarNavLayout) {
      next.sidebarNavLayout = current.sidebarNavLayout;
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { branding: next },
    });

    if (updated.slug !== 'platform') {
      void this.notifications
        .notifyUsersWithPermission({
          organizationId,
          type: 'system',
          title: 'Brand settings updated',
          body: `${updated.name} brand colors or logos were changed.`,
          href: '/dashboard/settings/brand',
        })
        .catch(() => undefined);
    }

    const branding = asBranding(updated.branding);
    return {
      ...this.resolvePublicBrand({
        name: updated.name,
        slug: updated.slug,
        branding: updated.branding,
      }),
      ...(branding.sidebarNavOrder
        ? { sidebarNavOrder: branding.sidebarNavOrder }
        : {}),
      ...(branding.sidebarNavLayout
        ? { sidebarNavLayout: branding.sidebarNavLayout }
        : {}),
    };
  }

  async uploadLogo(
    organizationId: string,
    variant: 'light' | 'dark' | 'favicon',
    file: UploadedLogo,
  ): Promise<PublicTenantBrand> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Logo file is required');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Logo must be 2MB or smaller');
    }

    const row = await this.prisma.organization.findFirst({
      where: { id: organizationId },
    });
    if (!row) {
      throw new NotFoundException('Organization not found');
    }

    const ext = extname(file.originalname).toLowerCase() || '.png';
    const allowed =
      variant === 'favicon'
        ? ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico']
        : ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
    const safeExt = allowed.includes(ext) ? ext : variant === 'favicon' ? '.png' : '.png';
    const dir = join(process.cwd(), 'uploads', organizationId);
    await mkdir(dir, { recursive: true });
    const filename = `${variant}${safeExt}`;
    await writeFile(join(dir, filename), file.buffer);

    const url = `/api/uploads/${organizationId}/${filename}?v=${Date.now()}`;
    return this.updateBranding(organizationId, {
      logos: { [variant]: url },
    });
  }

  brandingForSession(branding: unknown): OrganizationBranding | undefined {
    const parsed = asBranding(branding);
    if (
      !parsed.colors &&
      !parsed.logos?.light &&
      !parsed.logos?.dark &&
      !parsed.logos?.favicon
    ) {
      return undefined;
    }
    return {
      colors: parsed.colors,
      logos: parsed.logos,
    };
  }
}
