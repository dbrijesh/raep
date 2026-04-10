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
