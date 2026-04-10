# PROJECT.md — ToDo App

> Initialized: 2026-03-21
> Profile: enterprise-standard | Stack: React 19 · TypeScript · Express · SQLite

## Overview

**Project name:** ToDo App
**One-liner:** A personal task management app with a clean, modern UI for creating, updating, deleting, and assigning todos.

## Problem Statement

A personal productivity tool to manage tasks efficiently with an intuitive and visually appealing interface.

## Target Users

- **Primary:** Solo user (personal use)
- **User type:** Individual / personal productivity

## Goals

1. Provide a fast, clean interface for managing todos
2. Support full CRUD operations on tasks
3. Support assigning todos (to people, categories, or labels)
4. Deliver a polished, enjoyable UI experience
5. Maintain clean, readable, well-structured code

## Out of Scope (v1)

- Multi-user authentication / team collaboration
- Mobile native app
- Third-party integrations (calendar, Slack, etc.)
- Offline-first / PWA features

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 |
| Backend | TypeScript + Express |
| Database | SQLite |
| Cloud | AWS (optional, post-MVP) |

## Success Criteria

- All CRUD operations work reliably
- UI is polished and responsive
- Code is clean, typed, and well-structured (no `any`, explicit return types)
- No hardcoded secrets or credentials
- All errors handled explicitly

## Assumptions

- Single-user app (no auth required for MVP)
- Assignees are free-text labels or a predefined list (not user accounts)
- Data persists via SQLite on the backend
