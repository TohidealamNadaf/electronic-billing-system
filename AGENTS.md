# AGENTS.md - Billing System

## Build & Test Commands

**Backend (NestJS):**
- Build: `npm run build -C backend`
- Single test: `npm run test -- <filename>.spec.ts` (in backend dir)
- All tests: `npm run test -C backend`
- Watch: `npm run test:watch -C backend`
- Coverage: `npm run test:cov -C backend`
- Dev server: `npm run start:dev -C backend`
- Start prod: `npm run start:prod -C backend`

**Frontend (Angular):**
- Build: `npm run build -C frontend`
- Dev server: `npm run start -C frontend`
- Tests: `npm run test -C frontend`

**Electron:**
- Start: `npm start -C electron`

**Full Stack (Terminal 1+2+3)**:
- Terminal 1: `npm run start:dev -C backend`
- Terminal 2: `npm start -C frontend`
- Terminal 3: `npm start -C electron`

## Architecture

**Backend:** NestJS REST API with SQLite database (billing.db via TypeORM)
- `src/clients/` - Client management
- `src/invoices/` - Invoice generation & storage
- `src/products/` - Product/service catalog
- Port: 3000 (default)

**Frontend:** Angular 20 SPA with Bootstrap & Tailwind CSS
- `src/app/` - Angular components/modules
- Features: PDF export (jsPDF), document viewing, invoice UI

**Electron:** Desktop app wrapper (Node 22)
- `main.js` - Main process
- `preload.js` - IPC bridge

## Code Style

**TypeScript:**
- Target: ES2023, strict null checks enabled
- Decorators & experimental features enabled
- Single quotes, trailing commas
- Prettier formatting (see backend/.prettierrc, frontend/prettier config)

**Backend (ESLint):**
- Extends TypeScript ESLint recommended + Prettier
- Rules: no explicit `any` (off), unsafe args/floating promises (warn)
- Jest environment configured

**Frontend (Tailwind + Bootstrap):**
- Custom Tailwind config with PostCSS
- Angular formatting via prettier-code

**Imports:** Module-based (NestJS providers, Angular services)
**Naming:** camelCase files, PascalCase classes
**Error Handling:** HTTP exceptions via NestJS decorators
