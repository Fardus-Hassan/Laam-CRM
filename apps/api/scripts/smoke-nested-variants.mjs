/**
 * Regression smoke test for the ValidationPipe nested-DTO concern:
 * with `whitelist: true`, nested variant objects must survive the
 * class-transformer @Type(() => VariantDto) conversion instead of being
 * stripped to empty objects.
 *
 * Runs against the same class-transformer / class-validator copies the API
 * resolves at runtime. Exits 1 on any failure.
 *
 * Usage: node apps/api/scripts/smoke-nested-variants.mjs
 */
import 'reflect-metadata';

const { plainToInstance, Type } = await import('class-transformer');
const {
  validate,
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} = await import('class-validator');

// .mjs has no decorator syntax, so apply the same property decorators the
// controller DTOs use (products.controller.ts) imperatively.
function decorate(cls, property, decorators) {
  for (const decorator of decorators) {
    decorator(cls.prototype, property);
  }
}

class VariantDto {}
decorate(VariantDto, 'id', [IsOptional(), IsString(), MaxLength(64)]);
decorate(VariantDto, 'label', [IsString(), MinLength(1), MaxLength(120)]);
decorate(VariantDto, 'sku', [IsString(), MinLength(1), MaxLength(120)]);
decorate(VariantDto, 'salePrice', [
  Type(() => Number),
  IsNumber(),
  Min(0),
  Max(1_000_000_000),
]);
decorate(VariantDto, 'costPrice', [
  IsOptional(),
  Type(() => Number),
  IsNumber(),
  Min(0),
  Max(1_000_000_000),
]);
decorate(VariantDto, 'stock', [
  IsOptional(),
  Type(() => Number),
  IsInt(),
  Min(0),
  Max(1_000_000_000),
]);
decorate(VariantDto, 'reorderLevel', [
  IsOptional(),
  Type(() => Number),
  IsInt(),
  Min(0),
  Max(1_000_000),
]);

class CreateProductDto {}
decorate(CreateProductDto, 'name', [IsString(), MinLength(1), MaxLength(200)]);
decorate(CreateProductDto, 'sku', [IsString(), MinLength(1), MaxLength(120)]);
decorate(CreateProductDto, 'category', [IsOptional(), IsString(), MaxLength(120)]);
decorate(CreateProductDto, 'variants', [
  IsArray(),
  ArrayMaxSize(50),
  ValidateNested({ each: true }),
  Type(() => VariantDto),
]);

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const payload = {
  name: 'Sundarban Honey',
  sku: 'HNY-001',
  category: 'honey',
  rogueTopLevel: 'should be stripped',
  variants: [
    {
      label: 'Standard',
      sku: 'HNY-001-STD',
      salePrice: '499.5',
      stock: '25',
      rogueNested: 'should be stripped',
    },
  ],
};

// Mirrors main.ts ValidationPipe: whitelist + transform.
const dto = plainToInstance(CreateProductDto, payload);
const errors = await validate(dto, { whitelist: true });

assert(errors.length === 0, `expected no validation errors, got: ${JSON.stringify(errors)}`);
assert(Array.isArray(dto.variants) && dto.variants.length === 1, 'variants array lost in transform');
assert(dto.variants?.[0] instanceof VariantDto, 'variants[0] was not converted to VariantDto');
assert(
  dto.variants?.[0]?.label === 'Standard',
  `variants[0].label should survive whitelist transform, got: ${JSON.stringify(dto.variants?.[0]?.label)}`,
);
assert(dto.variants?.[0]?.sku === 'HNY-001-STD', 'variants[0].sku lost in transform');
assert(dto.variants?.[0]?.salePrice === 499.5, '@Type(() => Number) did not coerce salePrice');
assert(dto.variants?.[0]?.stock === 25, '@Type(() => Number) did not coerce stock');
assert(!('rogueNested' in (dto.variants?.[0] ?? {})), 'whitelist did not strip unknown nested property');
assert(!('rogueTopLevel' in dto), 'whitelist did not strip unknown top-level property');

// A genuinely invalid nested variant must still be rejected.
const badDto = plainToInstance(CreateProductDto, {
  name: 'Bad Product',
  sku: 'BAD-001',
  variants: [{ label: '', sku: 'BAD-001-STD', salePrice: -5 }],
});
const badErrors = await validate(badDto, { whitelist: true });
assert(badErrors.length > 0, 'invalid nested variant was not rejected');

if (failures.length > 0) {
  console.error('smoke-nested-variants FAILED:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('smoke-nested-variants OK: nested VariantDto survives whitelist ValidationPipe transform');
