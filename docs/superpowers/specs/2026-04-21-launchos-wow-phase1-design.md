# LaunchOS WOW Phase 1 — Design Spec

**Data:** 2026-04-21
**Scope:** Refundação para Projetos + Kickstart IA + Kanban Board

---

## Goal

Transformar o LaunchOS de uma ferramenta de lançamentos em uma plataforma de projetos de marketing digital com IA. O sistema passa a atender lançamentos, perpétuos, low tickets, campanhas e qualquer projeto de marketing — com a IA gerando a estrutura completa a partir de uma descrição em linguagem natural.

## Architecture

A entidade central `launches` é renomeada para `projects` com um campo `type` expandido. O fluxo de criação de projeto passa a ser guiado por IA (Kickstart IA) em vez de um formulário. O Kanban é adicionado como view principal do projeto, complementando o "Meu Dia" existente.

**Tech stack:** Next.js App Router, Supabase, Claude API (claude-sonnet-4-6), @dnd-kit para drag-and-drop.

---

## Section 1 — Data Model Changes

### Rename: `launches` → `projects`

```sql
alter table launches rename to projects;

-- Expand type field
alter table projects drop constraint launches_type_check;
alter table projects add constraint projects_type_check
  check (type in ('lancamento','perpetuo','low_ticket','campanha','outro'));

-- Rename foreign keys in dependent tables
alter table launch_phases rename column launch_id to project_id;
alter table tasks rename column launch_id to project_id;
```

### New table: `project_templates`

```sql
create table project_templates (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  name text not null,
  description text,
  phases_json jsonb not null default '[]',
  created_at timestamptz default now()
);
```

`phases_json` format:
```json
[
  {
    "name": "Pre-lancamento",
    "duration_days": 21,
    "tasks": [
      { "title": "Pagina de captura", "type": "copy", "duration_days": 5 },
      { "title": "Criativos de trafego", "type": "design", "duration_days": 7 }
    ]
  }
]
```

---

## Section 2 — Kickstart IA

### Overview

When a user creates a new project, instead of a form they see a chat interface. They describe the project in natural language. The system calls the Claude API and returns a structured plan (phases + tasks + deadlines + role assignments). The user reviews the plan and approves with one click — the project is created with all phases and tasks populated.

### API Route: `POST /api/projects/kickstart`

**Request:**
```json
{
  "description": "Curso de Instagram para pequenos negocios. Lancamento em 30 dias. Tenho copy, designer e gestor de trafego. Meta: 200 alunos.",
  "workspace_id": "uuid"
}
```

**Claude prompt structure:**
- System: "Voce e um PM senior especialista em lancamentos digitais. Dado um briefing de projeto, retorne APENAS um JSON valido com a estrutura do projeto."
- User: the description
- Response format enforced via JSON mode or structured prompt

**Response (from Claude, validated and returned):**
```json
{
  "name": "Curso Instagram para Negocios",
  "type": "lancamento",
  "launch_date": "2026-05-21",
  "phases": [
    {
      "name": "Pre-lancamento",
      "order": 1,
      "start_date": "2026-04-21",
      "end_date": "2026-05-11",
      "objective": "Gerar lista de leads qualificados",
      "tasks": [
        {
          "title": "Pagina de captura — headline e copy",
          "type": "copy",
          "due_date": "2026-04-26",
          "priority": "normal"
        }
      ]
    }
  ]
}
```

**Server action flow:**
1. Call Claude API with description + system prompt
2. Parse and validate JSON response
3. Return plan to frontend for user review (do NOT save yet)
4. On user approval: call `POST /api/projects/kickstart/confirm` with the plan
5. Confirm route creates project + phases + tasks in a single transaction

### Page: `/projetos/novo`

Two-step UI:
1. **Chat step** — `KickstartChat` component with a text area. User types description, submits. Shows loading state ("Gerando seu plano..."). On response shows the plan.
2. **Review step** — `PlanPreview` component. Shows phases and tasks grouped. Two buttons: "Aprovar e criar projeto" and "Editar antes de criar".

Edit mode: inline editing of phase names, task titles, due dates, and role assignments before confirming.

---

## Section 3 — Kanban Board

### Page: `/projetos/[id]/kanban`

Server component that loads the project with phases and tasks, renders `KanbanBoard`.

### Columns (fixed — map to task `status`)

| Column | Status value | Color |
|--------|-------------|-------|
| A Fazer | `a_fazer` | gray |
| Em Andamento | `em_andamento` | blue |
| Em Revisao | `em_revisao` (new) | amber |
| Aguardando Aprovacao | `aguardando_aprovacao` | violet |
| Concluido | `concluido` | green |

Note: add `em_revisao` to tasks status check constraint.

### Card design

Each card shows:
- Task title
- Left border color by role: copy=blue, design=pink, trafego=amber, estrategia=green, urgente=red
- Role tag + due date + assignee avatar initial
- Progress bar (if status = em_andamento)
- AI briefing badge (if briefing was generated)

### Drag and drop

Library: `@dnd-kit/core` + `@dnd-kit/sortable`. On drag end: optimistic UI update + server action `updateTaskStatus(taskId, newStatus)`. Revert on error.

### Phase tabs

Tabs at top switch between project phases. Each tab shows phase name + task count. Countdown to launch date always visible ("D-18 para o lancamento").

### Filters

Filter bar: All | Copy | Design | Trafego — filters cards client-side by `task.type`.

### Briefing IA por card

Each KanbanCard has a three-dot context menu. One option is "Gerar Briefing IA". System calls `POST /api/ai/briefing` which calls Claude with task context (title, type, project name, persona from project description) and returns a structured briefing. Briefing is saved to `tasks.description` and shown in the task detail.

---

## Section 4 — Routes and Component Map

### Renamed routes
- `/lancamentos` → `/projetos`
- `/lancamentos/novo` → `/projetos/novo` (replaced by Kickstart IA flow)

### New routes
- `GET/POST /projetos/[id]/kanban` — Kanban board page
- `POST /api/projects/kickstart` — generate plan from description
- `POST /api/projects/kickstart/confirm` — save approved plan to DB
- `POST /api/ai/briefing` — generate task briefing

### New components
- `app/(app)/projetos/novo/page.tsx` — Kickstart page
- `app/(app)/projetos/novo/KickstartChat.tsx` — chat UI (client)
- `app/(app)/projetos/novo/PlanPreview.tsx` — plan review UI (client)
- `app/(app)/projetos/[id]/kanban/page.tsx` — Kanban page
- `components/kanban/KanbanBoard.tsx` — board container with dnd-kit
- `components/kanban/KanbanColumn.tsx` — single column
- `components/kanban/KanbanCard.tsx` — task card

### Renamed components
- `components/dashboard/LaunchCard.tsx` → `ProjectCard.tsx`
- `app/(app)/lancamentos/` → `app/(app)/projetos/`

---

## Section 5 — What Does NOT Change

- Auth flow, middleware, onboarding
- Workspace and workspace_members
- Profiles
- Meu Dia page and daily focus AI
- Approvals (aprovacoes) page
- Task comments and checklist items
- All RLS policies (just rename table references)

---

## Out of Scope (Phase 2+)

- Timeline / Gantt view
- WhatsApp alerts
- Central de Comando (Dia D war room)
- Project templates UI (seed templates in DB, used by AI as context only)
