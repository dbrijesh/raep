# REQUIREMENTS.md — ToDo App

> Version: 1.0 | Updated: 2026-03-21

## Functional Requirements

### FR-01: Todo Creation
- User can create a new todo with a **title** (required)
- User can optionally add a **description**
- User can optionally set a **due date**
- User can optionally assign to an **assignee** (free-text label)
- User can set a **priority** (Low / Medium / High)
- New todos default to status: `pending`

### FR-02: Todo Viewing
- User can view all todos in a list/board view
- User can filter todos by: status, priority, assignee
- User can sort todos by: due date, priority, created date
- User can search todos by title/description

### FR-03: Todo Updating
- User can edit any field of an existing todo
- User can change the status: `pending` → `in-progress` → `done`
- User can mark a todo as complete with a single click/toggle

### FR-04: Todo Deletion
- User can delete a todo
- Deletion requires a confirmation step (to prevent accidental loss)

### FR-05: Todo Assignment
- User can assign a todo to a named assignee (free-text or from a saved list)
- Assignees are visible in the todo card/list
- User can filter todos by assignee

### FR-06: UI & Experience
- Clean, modern, responsive UI
- Visual status indicators (color-coded by priority/status)
- Smooth transitions and interactions
- Empty state messaging when no todos exist
- Toast/snackbar notifications for create/update/delete actions

---

## Non-Functional Requirements

### NFR-01: Code Quality
- Strict TypeScript — no `any` types, explicit return types on all public functions
- `const` by default; `let` only when reassignment is needed
- Functions ≤ 50 lines; files ≤ 800 lines
- All errors handled explicitly — no swallowed exceptions

### NFR-02: Security
- All user input validated and sanitized at API boundaries
- Parameterized queries only — no SQL string concatenation
- No hardcoded secrets or credentials
- Secure HTTP headers on all API responses

### NFR-03: Performance
- UI renders todo list with no perceptible lag (< 100ms interaction response)
- API responses < 200ms for standard CRUD operations

### NFR-04: Reliability
- Data persists across app restarts (SQLite)
- API returns meaningful error responses (4xx/5xx with messages)

---

## Data Model

### Todo
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (UUID) | Yes | Auto-generated |
| `title` | string | Yes | Max 200 chars |
| `description` | string | No | Max 2000 chars |
| `status` | enum | Yes | `pending`, `in-progress`, `done` |
| `priority` | enum | Yes | `low`, `medium`, `high` — default `medium` |
| `assignee` | string | No | Free-text label |
| `dueDate` | ISO date string | No | |
| `createdAt` | ISO datetime | Yes | Auto-set |
| `updatedAt` | ISO datetime | Yes | Auto-updated |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/todos` | List all todos (supports query filters) |
| `POST` | `/api/todos` | Create a new todo |
| `GET` | `/api/todos/:id` | Get a single todo |
| `PUT` | `/api/todos/:id` | Update a todo |
| `DELETE` | `/api/todos/:id` | Delete a todo |

---

## Prioritization (MoSCoW)

### Must Have
- Create, read, update, delete todos (FR-01 to FR-04)
- Assignment field (FR-05)
- Responsive, clean UI (FR-06)
- SQLite persistence

### Should Have
- Filter by status / priority / assignee
- Sort controls
- Priority color coding

### Could Have
- Search by title/description
- Due date display with overdue indicators
- Drag-and-drop reordering

### Won't Have (v1)
- Multi-user auth
- Real-time collaboration
- External integrations
