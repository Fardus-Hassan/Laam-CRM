import { BadRequestException, HttpException } from '@nestjs/common';

import {
  formatCourierBookError,
  isAlreadyBookedCourierError,
} from './courier-book-error.util';

describe('formatCourierBookError', () => {
  it('extracts Nest HttpException string message', () => {
    expect(
      formatCourierBookError(
        new BadRequestException('Shipping address must be at least 10 characters for Carrybee'),
      ),
    ).toBe('Shipping address must be at least 10 characters for Carrybee');
  });

  it('extracts message array from Nest response body', () => {
    const err = new HttpException({ message: ['a', 'b'], statusCode: 400 }, 400);
    expect(formatCourierBookError(err)).toBe('a, b');
  });

  it('does not leak prisma client dumps', () => {
    const err = new Error(
      'Invalid `prisma.order.updateMany()` invocation:\n{\n  data: { courierSubmitError: "x" }\n}',
    );
    expect(formatCourierBookError(err)).toMatch(/prisma generate/i);
    expect(formatCourierBookError(err)).not.toMatch(/updateMany/);
  });

  it('truncates long messages', () => {
    const long = 'x'.repeat(800);
    expect(formatCourierBookError(long, { maxLength: 40 })).toHaveLength(40);
  });

  it('defaults for unknown values', () => {
    expect(formatCourierBookError(null)).toBe('Courier submit failed');
    expect(formatCourierBookError(42)).toBe('Courier submit failed');
  });
});

describe('isAlreadyBookedCourierError', () => {
  it('detects already-booked messages', () => {
    expect(
      isAlreadyBookedCourierError(
        new BadRequestException('Already booked with pathao (C-1)'),
      ),
    ).toBe(true);
    expect(
      isAlreadyBookedCourierError(
        new BadRequestException('Shipping address must be at least 10 characters'),
      ),
    ).toBe(false);
  });
});
