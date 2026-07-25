---
name: raep-run
description: Launch and manage the RapidX full-stack demo application (React + Express + SQLite todo app) used to validate platform installation.
---

# Skill: raep-run

Run the RapidX platform demonstration application — a full-stack todo app used to verify that all agentic engineering workflows are correctly installed and functional.

## When to use

- After a fresh RapidX installation to confirm everything works end-to-end
- To demonstrate RapidX workflows (RapidX, spec-driven dev, TDD) to a new team
- As a reference implementation for React + Express + SQLite stack patterns

## Commands

```bash
# Install dependencies and start both client and server
cd .rapidx/demo/raep-run
npm run dev

# Run server only (port 3001)
cd server && npm start

# Run client only (port 5173)
cd client && npm run dev

# Run tests
cd server && npm test
```

## Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Express 4 + TypeScript + Node.js 18+
- **Database:** SQLite via better-sqlite3
- **Testing:** Vitest (client), Jest (server)

## Structure

```
raep-run/
├── client/          # React frontend
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       └── api/todos.ts
└── server/          # Express backend
    └── src/
        ├── db/connection.ts
        └── routes/todos.ts
```

## RapidX workflow validation

Once running, try these commands to validate the full RapidX workflow:

```
/rapidx:plan-phase    — Plan a new todo feature
/rapidx:execute-phase — Implement it with TDD
/rapidx:verify-work   — Run tests and checks
```
