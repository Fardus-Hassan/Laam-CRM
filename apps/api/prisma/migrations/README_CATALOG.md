# Catalog Prisma migrations

## Status

- Baseline migration: `20260719130000_catalog_baseline`
- Fresh environments (CI, new local DB): `pnpm db:migrate:deploy`
- Disposable local prototyping only: `pnpm db:push` (do not use for shared/staging/prod)

## Existing local databases (already applied via `db push`)

If your database already matches the schema but has no `_prisma_migrations` rows:

```bash
pnpm db:push
pnpm exec prisma migrate resolve --applied 20260719130000_catalog_baseline --schema=apps/api/prisma/schema.prisma
```

## Catalog soft-delete notes

- `Product.deletedAt` — archive / restore / hard-delete
- `ProductBrand.deletedAt` / `OrgCategory.deletedAt` — same lifecycle via recycle bin
