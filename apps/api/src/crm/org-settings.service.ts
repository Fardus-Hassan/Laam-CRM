import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IntegrationConfig, OrgProfile, OrgSettings } from '@laam/types';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type OrgSettingsJson = {
  email?: string;
  address?: string;
  district?: string;
  website?: string;
  timezone?: string;
  currency?: string;
  orderPrefix?: string;
  defaultCourier?: string;
};

const COURIER_LABELS: Record<string, string> = {
  pathao: 'Pathao Courier',
  carrybee: 'Carrybee Courier',
  steadfast: 'Steadfast Courier',
  redx: 'REDX Courier',
};

function asSettings(value: unknown): OrgSettingsJson {
  if (!value || typeof value !== 'object') return {};
  return value as OrgSettingsJson;
}

function asBranding(value: unknown): { logos?: { light?: string } } {
  if (!value || typeof value !== 'object') return {};
  return value as { logos?: { light?: string } };
}

@Injectable()
export class OrgSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(organizationId: string): Promise<OrgSettings> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        slug: true,
        phone: true,
        branding: true,
        settings: true,
      },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const couriers = await this.prisma.courierIntegration.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        enabled: true,
        lastSyncAt: true,
        lastError: true,
        credentialsEnc: true,
      },
    });

    const integrations: IntegrationConfig[] = couriers.map((row) =>
      this.toIntegration({
        id: row.id,
        provider: row.provider,
        label: COURIER_LABELS[row.provider] ?? row.provider,
        enabled: row.enabled,
        hasCredentials: Boolean(row.credentialsEnc),
        lastAt: row.lastSyncAt,
        lastError: row.lastError,
      }),
    );

    return {
      profile: this.toProfile(org),
      integrations,
    };
  }

  async updateProfile(
    organizationId: string,
    input: Partial<OrgProfile>,
  ): Promise<OrgProfile> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const name = input.name?.trim();
    const slug = input.slug?.trim().toLowerCase();
    if (slug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new BadRequestException('Slug must be lowercase letters, numbers, and hyphens');
      }
      if (slug === 'platform') {
        throw new BadRequestException('This slug is reserved');
      }
      const taken = await this.prisma.organization.findFirst({
        where: { slug, NOT: { id: organizationId } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('This slug is already in use');
    }

    if (input.email && input.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
        throw new BadRequestException('Enter a valid email');
      }
    }

    if (input.defaultCourier?.trim()) {
      const courier = await this.prisma.courierIntegration.findFirst({
        where: {
          organizationId,
          provider: input.defaultCourier.trim(),
          enabled: true,
          credentialsEnc: { not: null },
        },
        select: { id: true },
      });
      if (!courier) {
        throw new BadRequestException('Select a connected courier, or leave default courier empty');
      }
    }

    const current = asSettings(org.settings);
    const next: OrgSettingsJson = {
      ...current,
      ...(input.email !== undefined ? { email: input.email.trim() } : {}),
      ...(input.address !== undefined ? { address: input.address.trim() } : {}),
      ...(input.district !== undefined ? { district: input.district.trim() } : {}),
      ...(input.website !== undefined ? { website: input.website.trim() } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone.trim() } : {}),
      ...(input.currency !== undefined ? { currency: input.currency.trim().toUpperCase() } : {}),
      ...(input.orderPrefix !== undefined
        ? { orderPrefix: this.normalizeOrderPrefix(input.orderPrefix) }
        : {}),
      ...(input.defaultCourier !== undefined
        ? { defaultCourier: input.defaultCourier.trim() }
        : {}),
    };

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug } : {}),
        ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
        settings: next as unknown as Prisma.InputJsonValue,
      },
      select: {
        name: true,
        slug: true,
        phone: true,
        branding: true,
        settings: true,
      },
    });
    return this.toProfile(updated);
  }

  private normalizeOrderPrefix(raw: string): string {
    const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    return cleaned;
  }

  private toProfile(org: {
    name: string;
    slug: string;
    phone: string | null;
    branding: unknown;
    settings: unknown;
  }): OrgProfile {
    const settings = asSettings(org.settings);
    const branding = asBranding(org.branding);
    return {
      name: org.name,
      slug: org.slug,
      email: settings.email ?? '',
      phone: org.phone ?? '',
      address: settings.address ?? '',
      district: settings.district ?? '',
      logoUrl: branding.logos?.light || undefined,
      website: settings.website || undefined,
      timezone: settings.timezone ?? '',
      currency: settings.currency ?? '',
      orderPrefix: settings.orderPrefix ?? '',
      defaultCourier: settings.defaultCourier ?? '',
    };
  }

  private toIntegration(input: {
    id: string;
    provider: string;
    label: string;
    enabled: boolean;
    hasCredentials: boolean;
    lastAt: Date | null;
    lastError: string | null;
  }): IntegrationConfig {
    const status: IntegrationConfig['status'] = !input.enabled || !input.hasCredentials
      ? 'disconnected'
      : input.lastError
        ? 'error'
        : 'connected';
    const provider = (
      ['pathao', 'carrybee', 'steadfast', 'redx', 'facebook', 'bkash', 'nagad', 'smtp', 'woocommerce'] as const
    ).includes(input.provider as never)
      ? (input.provider as IntegrationConfig['provider'])
      : 'smtp';
    return {
      id: input.id,
      provider,
      label: input.label,
      status,
      lastSyncAt: input.lastAt?.toISOString(),
      errorMessage: input.lastError ?? undefined,
    };
  }
}
