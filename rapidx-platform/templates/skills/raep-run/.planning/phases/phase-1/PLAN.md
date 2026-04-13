# PLAN.md — Phase 1: Project Foundation

> Project: ToDo App
> Phase: 1 of 5
> Goal: Scaffold the full-stack monorepo with a working dev environment and SQLite database.
> Created: 2026-03-21

---

## Exit Criteria

- [ ] `GET /api/todos` returns `[]` from a live SQLite database
- [ ] React 19 app loads in the browser and renders without errors
- [ ] TypeScript strict mode compiles with zero errors on both client and server
- [ ] ESLint passes on both client and server with zero warnings

---

## Directory Structure (Target)

```
/
├── client/                   # React 19 frontend (Vite)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── api/
│   │       └── todos.ts      # API client (typed fetch wrappers)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                   # Express + TypeScript backend
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── router.ts         # Route registration
│   │   ├── routes/
│   │   │   └── todos.ts      # Placeholder todo routes
│   │   ├── db/
│   │   │   ├── connection.ts # SQLite connection
│   │   │   ├── migrate.ts    # Schema migrations runner
│   │   │   └── migrations/
│   │   │       └── 001_create_todos.sql
│   │   └── middleware/
│   │       └── secureHeaders.ts
│   ├── tsconfig.json
│   └── package.json
│
├── .eslintrc.base.json       # Shared ESLint config
├── .prettierrc
└── package.json              # Root package.json (workspaces)
```

---

## Tasks

### Task 1 — Initialise Monorepo

**File:** `package.json` (root)

Create a npm workspaces monorepo with `client` and `server` as packages.

```json
{
  "name": "todo-app",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace=server\" \"npm run dev --workspace=client\"",
    "build": "npm run build --workspace=server && npm run build --workspace=client",
    "lint": "npm run lint --workspace=server && npm run lint --workspace=client"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

---

### Task 2 — Server: Express + TypeScript

**Files:** `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`

**`server/package.json`** — key deps:
```json
{
  "name": "@todo-app/server",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "express": "^4.21.0",
    "better-sqlite3": "^11.0.0",
    "helmet": "^8.0.0",
    "cors": "^2.8.5",
    "uuid": "^11.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/cors": "^2.8.0",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.7.0"
  }
}
```

**`server/tsconfig.json`** — strict mode:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**`server/src/index.ts`:**
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router } from './router';
import { runMigrations } from './db/migrate';

const PORT = process.env.PORT ?? 3001;

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', router);

runMigrations();

app.listen(PORT, () => {
  console.log(`[RapidX] Server running on http://localhost:${PORT}`);
});
```

---

### Task 3 — SQLite Database Layer

**Files:** `server/src/db/connection.ts`, `server/src/db/migrate.ts`, `server/src/db/migrations/001_create_todos.sql`

**`server/src/db/connection.ts`:**
```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '../../data/todos.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}
```

**`server/src/db/migrations/001_create_todos.sql`:**
```sql
CREATE TABLE IF NOT EXISTS todos (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL CHECK(length(title) <= 200),
  description TEXT CHECK(description IS NULL OR length(description) <= 2000),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK(status IN ('pending', 'in-progress', 'done')),
  priority    TEXT NOT NULL DEFAULT 'medium'
              CHECK(priority IN ('low', 'medium', 'high')),
  assignee    TEXT,
  due_date    TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
```

**`server/src/db/migrate.ts`:**
```typescript
import fs from 'fs';
import path from 'path';
import { getDb } from './connection';

export function runMigrations(): void {
  const db = getDb();
  const migrationsDir = path.join(__dirname, 'migrations');

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.exec(sql);
    console.log(`[RapidX] Migration applied: ${file}`);
  }
}
```

---

### Task 4 — Express Router with Placeholder Routes

**Files:** `server/src/router.ts`, `server/src/routes/todos.ts`

**`server/src/router.ts`:**
```typescript
import { Router } from 'express';
import { todosRouter } from './routes/todos';

export const router = Router();

router.use('/todos', todosRouter);
```

**`server/src/routes/todos.ts`** — placeholder returning empty array:
```typescript
import { Router, Request, Response } from 'express';

export const todosRouter = Router();

todosRouter.get('/', (_req: Request, res: Response): void => {
  res.json([]);
});
```

---

### Task 5 — Client: React 19 + Vite

**Files:** `client/package.json`, `client/vite.config.ts`, `client/tsconfig.json`, `client/src/main.tsx`, `client/src/App.tsx`

**`client/package.json`** — key deps:
```json
{
  "name": "@todo-app/client",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

**`client/vite.config.ts`:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```

**`client/src/App.tsx`** — smoke-test placeholder:
```tsx
export default function App(): React.JSX.Element {
  return (
    <div>
      <h1>ToDo App</h1>
      <p>Phase 1 — Foundation complete.</p>
    </div>
  );
}
```

---

### Task 6 — ESLint + Prettier

**Files:** `.eslintrc.base.json`, `.prettierrc`

**`.prettierrc`:**
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**`.eslintrc.base.json`:**
```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-console": "off"
  }
}
```

---

### Task 7 — Secure Headers Middleware

**File:** `server/src/middleware/secureHeaders.ts`

> **Note:** `helmet` already applied globally in `index.ts`. This file documents the explicit header policy for review purposes.

```typescript
import { RequestHandler } from 'express';
import helmet from 'helmet';

export const secureHeaders: RequestHandler = helmet({
  contentSecurityPolicy: false, // relaxed for API-only server
  crossOriginEmbedderPolicy: false,
});
```

---

## Security Checklist (Phase 1)

- [x] No hardcoded secrets — DB path and ports via `process.env`
- [x] CORS restricted to known client origin via env var
- [x] `helmet` middleware applied to all routes
- [x] SQLite WAL mode + foreign keys enforced
- [x] TypeScript strict mode — no implicit `any`

---

## Verification Steps

Run these to confirm exit criteria are met:

```bash
# 1. Install dependencies
npm install

# 2. Start both servers
npm run dev

# 3. Verify API
curl http://localhost:3001/api/todos
# Expected: []

# 4. Verify client
# Open http://localhost:5173 — should show "ToDo App" heading

# 5. TypeScript check
npm run build --workspace=server
npm run build --workspace=client

# 6. Lint
npm run lint
```

---

## Next Step

Once exit criteria are verified, run `/rapidx:execute-phase 1` to implement the code, then `/rapidx:verify-work` to confirm before proceeding to Phase 2.
