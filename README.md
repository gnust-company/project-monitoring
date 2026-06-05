# ProjectHub — Project Management Dashboard

A fully functional prototype of a Project Management Dashboard built for Project Managers to oversee multiple projects, track timelines, and manage tasks.

## Features

- **Organization Selector** — Choose from multiple workspaces/organizations
- **Project Dashboard** — Overview of all projects with filters, search, and status indicators
- **Gantt-Style Timeline** — Split-pane view with task list and horizontal calendar timeline
  - Red "Today" marker for visual reference
  - Day/Week/Month zoom levels
  - Color-coded task bars by status
- **Task Detail Sidebar** — Slide-in panel with:
  - Task details, assignee, priority
  - Markdown description editor
  - Real-time comments thread
  - File attachments (mock upload)
  - Activity log

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- date-fns (date handling)
- Lucide React (icons)
- React Context (state management)

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
  types.ts                    # TypeScript interfaces
  data/
    mockData.ts               # Mock data (3 Orgs, 15 Projects, 100+ Tasks)
  context/
    AppContext.tsx             # Global state management
  components/
    OrgSelector/               # View A: Organization selection
    Dashboard/                 # View B: Project dashboard
    Timeline/                  # View C: Gantt timeline
    TaskSidebar/               # View D: Task detail sidebar
  App.tsx                      # Main app with view routing
```

## Mock Data

The app comes pre-loaded with:
- 3 Organizations (TechNova Solutions, GreenWave Digital, Apex Innovations)
- 10 Users with different roles (PM, Dev, Designer, QA)
- 15 Projects across all phases (Init → Done)
- 100+ Tasks with realistic date ranges

## Architecture Notes

- All data is in-memory (mock). No backend required.
- Clear separation between data layer (`data/mockData.ts`) and components.
- A real API layer can be swapped in by replacing the mock data functions.
- State management uses React Context for simplicity.
