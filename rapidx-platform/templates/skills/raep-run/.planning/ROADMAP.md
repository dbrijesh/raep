# ROADMAP.md — ToDo App

> Version: 1.0 | Updated: 2026-03-21
> Stack: React 19 · TypeScript · Express · SQLite

---

## Phase 1 — Project Foundation
**Goal:** Scaffold the full-stack project with working dev environment and database.

### Tasks
- [ ] Initialise monorepo structure (`/client`, `/server`)
- [ ] Set up Express server with TypeScript (strict mode)
- [ ] Configure SQLite database with schema migrations
- [ ] Create `todos` table (all fields per data model)
- [ ] Implement database access layer (typed queries, parameterized)
- [ ] Set up Express router with placeholder routes
- [ ] Set up React 19 frontend with Vite
- [ ] Configure ESLint + Prettier for both client and server
- [ ] Verify dev server runs end-to-end (client ↔ API ↔ DB)

**Exit criteria:** `GET /api/todos` returns `[]` from a live SQLite DB; React app loads in browser.

---

## Phase 2 — Core API (CRUD)
**Goal:** Implement all REST endpoints with full validation and error handling.

### Tasks
- [ ] `POST /api/todos` — create todo with input validation
- [ ] `GET /api/todos` — list todos with optional filters (status, priority, assignee)
- [ ] `GET /api/todos/:id` — fetch single todo (404 on missing)
- [ ] `PUT /api/todos/:id` — update todo fields (partial update supported)
- [ ] `DELETE /api/todos/:id` — delete todo (404 on missing)
- [ ] Add request validation middleware (reject invalid payloads with 400)
- [ ] Add secure HTTP headers middleware
- [ ] Write unit tests for all route handlers

**Exit criteria:** All 5 endpoints respond correctly; invalid inputs return 400; missing IDs return 404.

---

## Phase 3 — Frontend Core UI
**Goal:** Build the main todo interface with full CRUD wired to the API.

### Tasks
- [ ] Design component architecture (`TodoList`, `TodoCard`, `TodoForm`, `TodoFilters`)
- [ ] Implement `TodoList` — renders all todos from API
- [ ] Implement `TodoCard` — displays todo with status, priority, assignee, due date
- [ ] Implement `TodoForm` — create/edit form with all fields, controlled inputs
- [ ] Implement `TodoFilters` — filter bar (status, priority, assignee)
- [ ] Wire create flow: form → `POST /api/todos` → list refresh
- [ ] Wire update flow: edit modal/inline → `PUT /api/todos/:id` → list refresh
- [ ] Wire delete flow: confirm dialog → `DELETE /api/todos/:id` → list refresh
- [ ] Add loading and error states throughout
- [ ] Add empty state when no todos exist

**Exit criteria:** User can create, view, edit, and delete todos end-to-end in the browser.

---

## Phase 4 — Polish & UX
**Goal:** Elevate the UI to "cool" — visual polish, micro-interactions, responsive design.

### Tasks
- [ ] Apply consistent color system (priority colors: red/amber/green, status indicators)
- [ ] Add toast/snackbar notifications for create, update, delete success/error
- [ ] Add smooth CSS transitions for card appearance/removal
- [ ] Implement sort controls (by due date, priority, created date)
- [ ] Implement search/filter by title
- [ ] Overdue indicator on past-due todos
- [ ] Responsive layout (mobile-friendly)
- [ ] Keyboard accessibility (focus management, escape to close modals)

**Exit criteria:** UI looks polished, responsive on mobile, all interactions have visual feedback.

---

## Phase 5 — Verification & Cleanup
**Goal:** Code quality review, test coverage, and final checks before ship.

### Tasks
- [ ] Run full TypeScript strict mode check — zero errors
- [ ] Ensure no `any` types, all public functions have explicit return types
- [ ] Security review: input validation, parameterized queries, no secrets in code
- [ ] Add missing error handling (unhandled promise rejections, try/catch coverage)
- [ ] Write e2e tests (happy path: create → update → delete a todo)
- [ ] Code review pass: functions ≤ 50 lines, files ≤ 800 lines
- [ ] Update README with setup instructions

**Exit criteria:** All tests pass, zero TypeScript errors, security checklist clear, README complete.

---

## Milestone Summary

| Phase | Focus | Status |
|---|---|---|
| 1 | Project Foundation | Not started |
| 2 | Core API (CRUD) | Not started |
| 3 | Frontend Core UI | Not started |
| 4 | Polish & UX | Not started |
| 5 | Verification & Cleanup | Not started |

---

**Next step:** Run `/rapidx:plan-phase 1` to begin Phase 1 execution.
