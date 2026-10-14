# FlowDesk

A modern student productivity workspace — notes, tasks, and a calendar in one
clean app. Built as a React + TypeScript single-page app backed by a Java
Spring Boot REST API with a SQLite database.

---

## Features

### Notes
- **WYSIWYG rich-text editor** (Tiptap) — headings, bold/italic/underline,
  bullet/numbered/checklists, links, blockquotes, code blocks, dividers, and
  **tables**. Formatting appears live as you type.
- **Folders → Notebooks → Notes** hierarchy with a unified, Apple-Notes-style
  navigation tree.
- **Drag and drop** — drag notes into notebooks, and notebooks into folders.
- **Autosave** with a save-status indicator (Saving / Saved / retry on error).
- **Favorites**, **Recent**, and full-text **search** across notes.
- Notes are stored as Markdown, so content stays portable.

### Tasks
- **Kanban board** (To Do / In Progress / Done) with drag-and-drop between
  columns.
- **Subtasks**, priority, due date, and a per-task notebook/course link.
- **Recurring tasks** — daily, weekly, every 2 weeks, monthly, yearly, or every
  N days. Completing a recurring task advances it to the next occurrence.

### Calendar
- **Month / Week / Day** views with an agenda side panel.
- Create and edit events with times, locations, and colors.
- **Tasks appear on the calendar** by due date, including every projected
  occurrence of recurring tasks.
- Month/year dropdowns plus prev/next and "Today" for quick navigation.

### Dashboard
- Live snapshot: open tasks (with overdue badges), today's agenda, recent
  notes, and quick stats.
- **Quick Capture** turns a thought into a note instantly.

### Across the app
- **Quick Add** menu to create a note, task, or event from anywhere.
- Global workspace **search**.
- Consistent design system: purple accent, rounded corners, soft shadows,
  light-gray canvas.

---

## Tech stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router, Tiptap, dnd-kit |
| Backend   | Java 21, Spring Boot 3.3, Spring Data JPA |
| Database  | SQLite (via Hibernate community dialect) |
| Build     | Vite (frontend), Maven (backend) |

---

## Project structure

```
.
├── flowdesk/          # React + TypeScript frontend (Vite)
│   └── src/
│       ├── api/          # REST client modules
│       ├── components/   # layout, ui, notes, tasks, calendar
│       ├── pages/        # Dashboard, Notes, Tasks, Calendar, Profile
│       ├── store/        # Zustand stores
│       └── lib/          # helpers (dates, markdown, cn)
├── flowdesk-api/      # Java Spring Boot backend (Maven)
│   └── src/main/java/io/flowdesk/api/
│       ├── note/         # notes
│       ├── notebook/     # notebooks
│       ├── folder/       # folders
│       ├── task/         # tasks + subtasks
│       ├── event/        # calendar events
│       ├── search/       # global search
│       └── common/       # seeder, CORS, error handling
├── start-flowdesk.cmd # one-click launcher (Windows)
├── run-api.cmd        # starts the backend
└── run-web.cmd        # starts the frontend
```

---

## Prerequisites

- **Java 21** (JDK) — e.g. [Eclipse Temurin](https://adoptium.net/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Maven** — bundled under `tools/` in local setup, or install your own

---

## Running it

### Windows (easiest)

Double-click **`start-flowdesk.cmd`**. It starts both servers and opens the app
at <http://localhost:5173/>.

> Note: the launcher scripts use absolute paths for Java/Node/Maven that match
> the original dev machine. On a different computer, edit the paths at the top
> of `run-api.cmd`, `run-web.cmd`, and `start-flowdesk.cmd`, or run manually
> (below).

### Manual (any OS)

**Backend** (from `flowdesk-api/`):

```bash
# build once
mvn clean package

# run
java -jar target/flowdesk-api-0.0.1-SNAPSHOT.jar
# API now at http://localhost:8080
```

Or during development: `mvn spring-boot:run`

**Frontend** (from `flowdesk/`):

```bash
npm install          # first time only
npm run dev
# app now at http://localhost:5173
```

The frontend expects the API at `http://localhost:8080`. To point elsewhere,
set `VITE_API_URL` before `npm run dev`.

---

## Data

- The database is a single SQLite file, `flowdesk-api/flowdesk.db`, created
  automatically on first run.
- On an empty database, the app **seeds demo data** (folders, notebooks, notes,
  tasks, and events) dated relative to the current day, so it looks populated
  immediately.
- To reset to fresh demo data, stop the backend, delete
  `flowdesk-api/flowdesk.db`, and restart.

---

## API overview

Base URL: `http://localhost:8080/api`

| Resource   | Endpoints |
|------------|-----------|
| Notes      | `GET/POST /notes`, `GET/PUT/DELETE /notes/{id}`, `PATCH /notes/{id}/favorite` |
| Notebooks  | `GET/POST /notebooks`, `PUT/DELETE /notebooks/{id}` |
| Folders    | `GET/POST /folders`, `PUT/DELETE /folders/{id}` |
| Tasks      | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/{id}`, `PATCH /tasks/{id}/status` |
| Events     | `GET/POST /events` (`?from=&to=`), `GET/PUT/DELETE /events/{id}` |
| Search     | `GET /search?q=` (notes + tasks) |

---

## Notes & limitations

- Built and tested on Windows with a local SQLite database; no auth or
  multi-user support (single-user app).
- Profile edits are session-only (not yet persisted to the backend).
- The frontend bundle is sizable because of the rich-text editor; fine for a
  local app.
