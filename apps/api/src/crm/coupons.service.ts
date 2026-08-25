import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Coupon, CreateCouponPayload } from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';

export type CouponValidateResult = {
  valid: boolean;
  discount: number;
  message?: string;
  coupon?: Coupon;
};

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: {
    id: string;
    code: string;
    type: string;
    value: number;
    minOrderBdt: number | null;
    maxDiscountBdt: number | null;
    usageCount: number;
    usageLimit: number | null;
    expiresAt: Date | null;
    isActive: boolean;
    description: string | null;
  }): Coupon {
    return {
      id: row.id,
      code: row.code,
      type: row.type as Coupon['type'],
      value: row.value,
      minOrderBdt: row.minOrderBdt ?? undefined,
      maxDiscountBdt: row.maxDiscountBdt ?? undefined,
      usageCount: row.usageCount,
      usageLimit: row.usageLimit ?? undefined,
      expiresAt: row.expiresAt?.toISOString().slice(0, 10),
      isActive: row.isActive,
      description: row.description ?? undefined,
    };
  }

  async list(organizationId: string): Promise<Coupon[]> {
    const rows = await this.prisma.coupon.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(organizationId: string, payload: CreateCouponPayload): Promise<Coupon> {
    const code = payload.code.trim().toUpperCase();
    if (code.length < 2) throw new BadRequestException('Coupon code is too short');
    try {
      const row = await this.prisma.coupon.create({
        data: {
          organizationId,
          code,
          type: payload.type,
          value: payload.value,
          minOrderBdt: payload.minOrderBdt ?? null,
          maxDiscountBdt: payload.maxDiscountBdt ?? null,
          usageLimit: payload.usageLimit ?? null,
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
          description: payload.description?.trim() || null,
          isActive: true,
        },
      });
      return this.toDto(row);
    } catch {
      throw new BadRequestException('Coupon code already exists');
    }
  }

  async toggle(organizationId: string, id: string): Promise<Coupon> {
    const existing = await this.prisma.coupon.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Coupon not found');
    const row = await this.prisma.coupon.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    return this.toDto(row);
  }

  async update(
    organizationId: string,
    id: string,
    payload: Partial<{
      code: string;
      type: 'percent' | 'fixed';
      value: number;
      minOrderBdt: number | null;
      maxDiscountBdt: number | null;
      usageLimit: number | null;
      expiresAt: string | null;
      description: string | null;
      isActive: boolean;
    }>,
  ): Promise<Coupon> {
    const existing = await this.prisma.coupon.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Coupon not found');

    const data: Record<string, unknown> = {};
    if (payload.code !== undefined) {
      const code = payload.code.trim().toUpperCase();
      if (code.length < 2) throw new BadRequestException('Coupon code is too short');
      data.code = code;
    }
    if (payload.type !== undefined) data.type = payload.type;
    if (payload.value !== undefined) data.value = payload.value;
    if (payload.minOrderBdt !== undefined) data.minOrderBdt = payload.minOrderBdt;
    if (payload.maxDiscountBdt !== undefined) data.maxDiscountBdt = payload.maxDiscountBdt;
    if (payload.usageLimit !== undefined) data.usageLimit = payload.usageLimit;
    if (payload.expiresAt !== undefined) {
      data.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
    }
    if (payload.description !== undefined) {
      data.description = payload.description?.trim() || null;
    }
    if (payload.isActive !== undefined) data.isActive = payload.isActive;

    try {
      const row = await this.prisma.coupon.update({ where: { id }, data });
      return this.toDto(row);
    } catch {
      throw new BadRequestException('Coupon code already exists');
    }
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.coupon.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Coupon not found');
    await this.prisma.coupon.delete({ where: { id } });
  }

  calcDiscount(coupon: Coupon, amount: number): number {
    if (amount <= 0) return 0;
    if (coupon.minOrderBdt && amount < coupon.minOrderBdt) return 0;
    let discount =
      coupon.type === 'percent' ? (amount * coupon.value) / 100 : coupon.value;
    if (coupon.maxDiscountBdt) discount = Math.min(discount, coupon.maxDiscountBdt);
    return Math.min(Math.max(0, discount), amount);
  }

  private isUsable(coupon: Coupon): { ok: boolean; message?: string } {
    if (!coupon.isActive) return { ok: false, message: 'Coupon is inactive' };
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { ok: false, message: 'Coupon has expired' };
    }
    if (
      coupon.usageLimit != null &&
      coupon.usageCount >= coupon.usageLimit
    ) {
      return { ok: false, message: 'Coupon usage limit reached' };
    }
    return { ok: true };
  }

  async validate(
    organizationId: string,
    code: string,
    orderSubtotal: number,
  ): Promise<CouponValidateResult> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      return { valid: false, discount: 0, message: 'Coupon code is required' };
    }
    const row = await this.prisma.coupon.findFirst({
      where: { organizationId, code: normalized },
    });
    if (!row) {
      return { valid: false, discount: 0, message: 'Invalid coupon code' };
    }
    const coupon = this.toDto(row);
    const usable = this.isUsable(coupon);
    if (!usable.ok) {
      return { valid: false, discount: 0, message: usable.message, coupon };
    }
    const discount = this.calcDiscount(coupon, orderSubtotal);
    if (discount <= 0) {
      return {
        valid: false,
        discount: 0,
        message: coupon.minOrderBdt
          ? `Minimum order ৳${coupon.minOrderBdt} required`
          : 'Coupon does not apply to this amount',
        coupon,
      };
    }
    return { valid: true, discount, coupon };
  }

  async consumeUsage(organizationId: string, code: string): Promise<void> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    await this.prisma.coupon.updateMany({
      where: { organizationId, code: normalized, isActive: true },
      data: { usageCount: { increment: 1 } },
    });
  }
}
