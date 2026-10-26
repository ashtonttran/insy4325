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
- **Notes browser** with a compact two-row header: a **My Notes** heading plus
  **New Note**, and a four-way view switcher — **All Notes / Folders /
  Favorites / Recent** — shown as equal-width icon tiles.
- **List and grid** browsing modes, with sorting by last edited, date created,
  or title.
- **Folders view** — a collapsible **Folders → Notebooks → Notes** explorer with
  note counts, right inside the browser panel.
- **Move to notebook** via a searchable dialog (create a notebook on the fly),
  plus **bulk move** for multiple selected notes. Drag-and-drop still works too.
- **Focused editor** with a clickable notebook breadcrumb, a collapsible browser
  (focus mode), and a comfortable reading width.
- **Autosave** with a save-status indicator (Saving / Saved / retry on error).
- **Favorites**, **Recent**, and full-text **search** across notes.
- Notes are stored as Markdown, so content stays portable.

### Tasks
- **Kanban board** (To Do / In Progress / Done) with drag-and-drop between
  columns and an **All / Active / Completed** filter.
- **Subtasks**, priority, due date, and a per-task notebook/course link.
- **Recurring tasks** — daily, weekly, every 2 weeks, monthly, yearly, or every
  N days, with an optional **"repeats until" end date**. Completing a recurring
  task advances it to the next occurrence (and stops at the end date).

### Calendar
- **Month / Week / Day** views plus a **daily agenda sidebar** that updates when
  you select a day.
- **Events and tasks are visually distinct** — events use a calendar icon on a
  light-purple pill; tasks use a checkbox with neutral/priority styling, and can
  be completed right from the calendar.
- **Named calendars** (categories) with an All / Events / Tasks filter and
  advanced filters (completion, priority, category, overdue).
- Month view caps each day at two items with a **"+N more"** overflow.
- **Tasks appear on the calendar** by due date, including every projected
  occurrence of recurring tasks (honoring the end date).

### Connections between notes, tasks & events
- **Link a note to tasks and events** — create a task or schedule a study-session
  event straight from a note, or link an existing one.
- A note's **Linked items** section lists its tasks/events; task and event
  editors show their **linked notes**, with one-click navigation between them.

### Dashboard
- Personalized greeting plus a live snapshot: tasks due soon, today's events,
  weekly completion, today's agenda, and recent notes.
- **Quick Capture** turns a thought into a note instantly.

### Across the app
- **Quick Add** menu to create a note, task, or event from anywhere.
- Global workspace **search**.
- Consistent design system: purple accent, rounded corners, subtle borders,
  light-gray canvas. **Responsive** down to mobile (collapsible sidebar),
  accessible focus states, and reduced-motion support.

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
│       ├── note/         # notes + note↔task/event links
│       ├── notebook/     # notebooks
│       ├── folder/       # folders
│       ├── task/         # tasks + subtasks
│       ├── event/        # calendar events
│       ├── calendar/     # named calendars (categories)
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
- On an empty database, the app **seeds demo data** (calendars, folders,
  notebooks, notes, tasks, and events) dated relative to the current day, so it
  looks populated immediately.
- To reset to fresh demo data, stop the backend, delete
  `flowdesk-api/flowdesk.db`, and restart.

---

## API overview

Base URL: `http://localhost:8080/api`

| Resource   | Endpoints |
|------------|-----------|
| Notes      | `GET/POST /notes`, `GET/PUT/DELETE /notes/{id}`, `PATCH /notes/{id}/favorite` |
| Note links | `GET/POST /notes/{id}/links`, `DELETE /notes/{id}/links/{linkId}` |
| Notebooks  | `GET/POST /notebooks`, `PUT/DELETE /notebooks/{id}` |
| Folders    | `GET/POST /folders`, `PUT/DELETE /folders/{id}` |
| Tasks      | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/{id}`, `PATCH /tasks/{id}/status`, `GET /tasks/{id}/notes` |
| Events     | `GET/POST /events` (`?from=&to=`), `GET/PUT/DELETE /events/{id}`, `GET /events/{id}/notes` |
| Calendars  | `GET/POST /calendars`, `GET/PUT/DELETE /calendars/{id}` |
| Search     | `GET /search?q=` (notes + tasks) |

---

## Notes & limitations

- Built and tested on Windows with a local SQLite database; no auth or
  multi-user support (single-user app).
- Profile edits are session-only (not yet persisted to the backend).
- The frontend bundle is sizable because of the rich-text editor; fine for a
  local app.
