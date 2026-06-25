# LAAM CRM

Enterprise SaaS CRM monorepo (Nx + pnpm).

## Apps

| App | Port | Command |
|-----|------|---------|
| web (Next.js) | 3000 | `pnpm dev:web` |
| api (NestJS) | 3333 | `pnpm dev:api` |
| worker | — | `pnpm dev:worker` |

## Quick start

```bash
pnpm install
docker compose up -d
pnpm dev
```

Open http://localhost:3000

## Structure

```
apps/
  web/      Next.js frontend
  api/      NestJS backend
  worker/   Background jobs
packages/
  types/    Shared Zod schemas + TS types
```
