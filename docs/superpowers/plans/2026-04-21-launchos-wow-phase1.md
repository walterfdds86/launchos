# LaunchOS WOW Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform LaunchOS from a launches-only tool into a general digital marketing project platform, with AI-powered project kickstart (structure from natural language) and a Kanban board.

**Architecture:** Rename `launches` → `projects` (DB + types + routes), replace the project creation form with an AI chat that generates phases/tasks from a description, and add a Kanban board per project. Drag-and-drop uses @dnd-kit. All AI calls use the existing `anthropic` client and `ANTHROPIC_API_KEY` env var.

**Tech Stack:** Next.js 16 App Router, Supabase, Anthropic SDK (claude-sonnet-4-6), @dnd-kit/core + @dnd-kit/sortable, TypeScript strict.

**Supabase project:** `pybzghnxhklwanjauxbs` — migrations run via Management API using the Node.js pattern already established in the project.

---

### Task 1: DB Migration — rename launches → projects

**Files:**
- Create: `supabase/migrations/002_projects.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/002_projects.sql

-- Rename table
ALTER TABLE launches RENAME TO projects;

-- Rename launch_id column in dependent tables
ALTER TABLE launch_phases RENAME COLUMN launch_id TO project_id;
ALTER TABLE tasks RENAME COLUMN launch_id TO project_id;

-- Expand type constraint to include all project types
ALTER TABLE projects DROP CONSTRAINT IF EXISTS launches_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_type_check
  CHECK (type IN ('lancamento','perpetuo','low_ticket','campanha','outro'));

-- Add em_revisao to tasks status (between em_andamento and aguardando_aprovacao)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('a_fazer','em_andamento','em_revisao','aguardando_aprovacao','aprovado','concluido'));

-- Update RLS policies that reference old name (Supabase keeps policy names but table ref changes)
-- Re-create workspace member policies using new table name references
DROP POLICY IF EXISTS "Workspace members can read launches" ON projects;
DROP POLICY IF EXISTS "Gestores can insert launches" ON projects;
DROP POLICY IF EXISTS "Gestores can update launches" ON projects;

CREATE POLICY "Workspace members can read projects" ON projects
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Gestores can insert projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid() AND role = 'gestor')
  );

CREATE POLICY "Gestores can update projects" ON projects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid() AND role = 'gestor')
  );

-- project_templates table
CREATE TABLE project_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  name text NOT NULL,
  description text,
  phases_json jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
```

- [ ] **Step 2: Run the migration via Management API**

```bash
node -e "
const https = require('https');
const fs = require('fs');
const sql = fs.readFileSync('supabase/migrations/002_projects.sql', 'utf8');
const data = JSON.stringify({ query: sql });
const options = {
  hostname: 'api.supabase.com',
  path: '/v1/projects/pybzghnxhklwanjauxbs/database/query',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer \$SUPABASE_PAT',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};
const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, body.substring(0, 500)));
});
req.on('error', e => console.error(e.message));
req.write(data);
req.end();
"
```

Replace `\$SUPABASE_PAT` with the personal access token: `sbp_08bbd5ae43708e0a1063ea1b89aec6bff9b0fb64`

Expected: `STATUS: 201 []`

- [ ] **Step 3: Verify tables renamed correctly**

```bash
node -e "
const https = require('https');
const data = JSON.stringify({ query: \"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename\" });
const options = { hostname: 'api.supabase.com', path: '/v1/projects/pybzghnxhklwanjauxbs/database/query', method: 'POST', headers: { 'Authorization': 'Bearer sbp_08bbd5ae43708e0a1063ea1b89aec6bff9b0fb64', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
const req = https.request(options, res => { let b=''; res.on('data',d=>b+=d); res.on('end',()=>console.log(JSON.parse(b).map(r=>r.tablename).join(', '))); });
req.on('error',e=>console.error(e.message)); req.write(data); req.end();
"
```

Expected output contains: `project_templates, projects` (not `launches`)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_projects.sql
git commit -m "feat: migrate launches → projects, add em_revisao status, add project_templates"
```

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Replace the entire types/index.ts with updated version**

```typescript
// types/index.ts
export type WorkspaceRole = 'gestor' | 'copy' | 'designer' | 'trafego' | 'observador'

export type TaskStatus =
  | 'a_fazer'
  | 'em_andamento'
  | 'em_revisao'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'concluido'

export type TaskPriority = 'normal' | 'atencao' | 'urgente' | 'bloqueada'

export type TaskType = 'copy' | 'design' | 'trafego' | 'estrategia' | 'outro'

export type ProjectType = 'lancamento' | 'perpetuo' | 'low_ticket' | 'campanha' | 'outro'

export type ProjectStatus = 'rascunho' | 'ativo' | 'concluido' | 'pausado'

export interface Workspace {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface WorkspaceMember {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  joined_at: string
  user?: { email: string; full_name: string | null }
  workspace?: Workspace
}

export interface Project {
  id: string
  workspace_id: string
  name: string
  type: ProjectType
  launch_date: string
  status: ProjectStatus
  created_by: string
  created_at: string
  phases?: Phase[]
}

export interface Phase {
  id: string
  project_id: string
  name: string
  order: number
  start_date: string | null
  end_date: string | null
  objective: string | null
  tasks?: Task[]
}

export interface Task {
  id: string
  phase_id: string
  project_id: string
  workspace_id: string
  title: string
  description: string | null
  type: TaskType
  assigned_to: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  depends_on: string[]
  created_by: string
  created_at: string
  updated_at: string
  assignee?: { full_name: string | null; email: string }
  comments?: TaskComment[]
  checklist?: ChecklistItem[]
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  user?: { full_name: string | null; email: string }
}

export interface ChecklistItem {
  id: string
  task_id: string
  label: string
  completed: boolean
  order: number
}

export interface Approval {
  id: string
  task_id: string
  requested_by: string
  reviewed_by: string | null
  status: 'pendente' | 'aprovado' | 'revisao'
  feedback: string | null
  created_at: string
  reviewed_at: string | null
  task?: Task
}

export interface DailyFocus {
  id: string
  workspace_id: string
  user_id: string
  date: string
  tasks_json: Task[]
  ai_message: string
  created_at: string
}

export interface ProjectTemplate {
  id: string
  type: ProjectType
  name: string
  description: string | null
  phases_json: KickstartPhase[]
  created_at: string
}

export interface KickstartPlan {
  name: string
  type: ProjectType
  launch_date: string
  phases: KickstartPhase[]
}

export interface KickstartPhase {
  name: string
  order: number
  start_date: string
  end_date: string
  objective: string
  tasks: KickstartTask[]
}

export interface KickstartTask {
  title: string
  type: TaskType
  due_date: string
  priority: TaskPriority
}
```

- [ ] **Step 2: Fix TypeScript errors from the rename**

Run the build to surface all errors:

```bash
cd /tmp/launchos-deploy && npx tsc --noEmit 2>&1 | head -50
```

Expected: errors mentioning `Launch`, `launch_id`, `LaunchCard` — these get fixed in Task 3.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: rename Launch → Project types, add KickstartPlan interfaces, add em_revisao status"
```

---

### Task 3: Rename routes and components

**Files:**
- Create: `components/dashboard/ProjectCard.tsx`
- Modify: `components/layout/Sidebar.tsx`
- Create: `app/(app)/projetos/page.tsx`
- Modify: `app/(app)/dashboard/page.tsx`
- Delete: `app/(app)/lancamentos/page.tsx`, `app/(app)/lancamentos/novo/page.tsx`, `components/dashboard/LaunchCard.tsx`

- [ ] **Step 1: Create ProjectCard component**

Create `components/dashboard/ProjectCard.tsx`:

```tsx
import Link from 'next/link'
import { format, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Project, Phase } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  lancamento: 'Lançamento',
  perpetuo: 'Perpétuo',
  low_ticket: 'Low Ticket',
  campanha: 'Campanha',
  outro: 'Outro',
}

interface ProjectCardProps {
  project: Project & { phases: (Phase & { tasks: { status: string }[] })[] }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const daysLeft = differenceInDays(parseISO(project.launch_date), new Date())

  const badge = daysLeft < 0
    ? { label: 'Atrasado', cls: 'bg-red-950 text-red-400' }
    : daysLeft <= 7
    ? { label: 'Atenção', cls: 'bg-amber-950 text-amber-400' }
    : { label: 'No prazo', cls: 'bg-emerald-950 text-emerald-400' }

  const allTasks = project.phases?.flatMap((p) => p.tasks ?? []) ?? []
  const done = allTasks.filter((t) => ['aprovado', 'concluido'].includes(t.status)).length
  const total = allTasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <Link href={`/projetos/${project.id}/kanban`}>
      <div className="bg-[#17171f] border border-white/5 rounded-xl p-4 hover:border-violet-500/20 transition-colors cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-white">{project.name}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {TYPE_LABELS[project.type]} · {format(parseISO(project.launch_date), "dd 'de' MMM yyyy", { locale: ptBR })}
            </p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        <div className="space-y-2">
          {project.phases?.map((phase) => {
            const phaseTotal = phase.tasks?.length ?? 0
            const phaseDone = phase.tasks?.filter((t) => ['aprovado', 'concluido'].includes(t.status)).length ?? 0
            const phasePct = phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0
            return (
              <div key={phase.id}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-zinc-500">{phase.name}</span>
                  <span className="text-[10px] text-zinc-600">{phasePct}%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full">
                  <div className="h-1 bg-violet-600 rounded-full transition-all" style={{ width: `${phasePct}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">{done}/{total} tarefas</span>
          <span className="text-[10px] font-semibold text-violet-400">{pct}% completo</span>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Update Sidebar nav links**

Modify `components/layout/Sidebar.tsx` — change `lancamentos` to `projetos` in both nav arrays:

```tsx
const gestorNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projetos', label: 'Projetos', icon: Rocket },
  { href: '/aprovacoes', label: 'Aprovações', icon: CheckSquare },
  { href: '/time', label: 'Time', icon: Users },
]

const memberNav = [
  { href: '/meu-dia', label: 'Meu Dia', icon: Sun },
  { href: '/projetos', label: 'Projetos', icon: Rocket },
]
```

- [ ] **Step 3: Create app/(app)/projetos/page.tsx**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { Button } from '@/components/ui/button'
import type { Project, Phase } from '@/types'

export default async function ProjetosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/onboarding')

  const { data: projects } = await supabase
    .from('projects')
    .select('*, phases:launch_phases(*, tasks(id, status))')
    .eq('workspace_id', membership.workspace_id)
    .order('launch_date')

  return (
    <>
      <Topbar title="Projetos" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-zinc-500">{projects?.length ?? 0} projetos</p>
          {membership.role === 'gestor' && (
            <Link href="/projetos/novo">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                + Novo Projeto
              </Button>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(projects ?? []).map((p) => (
            <ProjectCard key={p.id} project={p as Project & { phases: (Phase & { tasks: { status: string }[] })[] }} />
          ))}
          {!projects?.length && (
            <p className="text-sm text-zinc-600 col-span-2">Nenhum projeto criado ainda.</p>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Update dashboard/page.tsx — swap LaunchCard for ProjectCard**

In `app/(app)/dashboard/page.tsx`, replace:
- `import { LaunchCard } from '@/components/dashboard/LaunchCard'` → `import { ProjectCard } from '@/components/dashboard/ProjectCard'`
- `.from('launches')` → `.from('projects')`
- `.from('tasks')...neq('status','aprovado').neq('status','concluido')` — no change needed
- All `<LaunchCard` → `<ProjectCard`
- All `launch` variable → `project`

Full updated dashboard page:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { StatsRow } from '@/components/dashboard/StatsRow'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { AlertsList } from '@/components/dashboard/AlertsList'
import { computePriority } from '@/lib/utils/priority'
import type { Task, Project, Phase } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/onboarding')
  if (membership.role !== 'gestor') redirect('/meu-dia')

  const workspaceId = membership.workspace_id

  const [{ data: projects }, { data: allTasks }] = await Promise.all([
    supabase
      .from('projects')
      .select('*, phases:launch_phases(*, tasks(status))')
      .eq('workspace_id', workspaceId)
      .eq('status', 'ativo')
      .order('launch_date'),
    supabase
      .from('tasks')
      .select('*, assignee:profiles!assigned_to(full_name, email)')
      .eq('workspace_id', workspaceId)
      .neq('status', 'aprovado')
      .neq('status', 'concluido'),
  ])

  const tasks = (allTasks ?? []) as Task[]
  const tasksWithPriority = tasks.map((t) => ({
    ...t,
    priority: computePriority(t, tasks),
  }))

  const pendingApprovals = tasks.length === 0
    ? 0
    : await supabase
        .from('approvals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .in('task_id', tasks.map((t) => t.id))
        .then(({ count }) => count)

  const overdueCount = tasksWithPriority.filter((t) => ['urgente', 'bloqueada'].includes(t.priority)).length

  const stats = [
    { label: 'Projetos Ativos', value: projects?.length ?? 0, sub: 'em andamento', variant: 'default' as const },
    { label: 'Tarefas Atrasadas', value: overdueCount, sub: 'urgente ou bloqueada', variant: overdueCount > 0 ? 'red' as const : 'default' as const },
    { label: 'Aguardando Aprovação', value: pendingApprovals ?? 0, sub: 'no seu inbox', variant: (pendingApprovals ?? 0) > 0 ? 'amber' as const : 'default' as const },
    { label: 'Concluídas (semana)', value: 0, sub: '↑ em breve', variant: 'green' as const },
  ]

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <StatsRow stats={stats} />
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Projetos Ativos</h2>
          <div className="grid grid-cols-2 gap-3">
            {(projects ?? []).map((project) => (
              <ProjectCard key={project.id} project={project as Project & { phases: (Phase & { tasks: { status: string }[] })[] }} />
            ))}
            {!projects?.length && (
              <p className="text-sm text-zinc-600 col-span-2">Nenhum projeto ativo.</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Aprovações Pendentes</h2>
            <p className="text-xs text-zinc-600">Ver em <a href="/aprovacoes" className="text-violet-400 underline">Central de Aprovações →</a></p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Alertas</h2>
            <AlertsList tasks={tasksWithPriority} />
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 5: Update meu-dia to use projects table**

In `app/(app)/meu-dia/page.tsx`, replace `.from('launches')` references. The page queries `tasks` directly (not `launches`), so no change needed there. Only check for `launch_id` → `project_id` in any select statements.

Run:
```bash
grep -n "launch" /tmp/launchos-deploy/app/\(app\)/meu-dia/page.tsx
```
Expected: no occurrences (meu-dia queries tasks directly).

- [ ] **Step 6: Delete old lancamentos files**

```bash
rm -rf /tmp/launchos-deploy/app/\(app\)/lancamentos
rm /tmp/launchos-deploy/components/dashboard/LaunchCard.tsx
```

- [ ] **Step 7: Verify build passes**

```bash
cd /tmp/launchos-deploy && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors (or only errors from files not yet created in Tasks 4-7).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: rename launches→projetos throughout — routes, components, sidebar, dashboard"
```

---

### Task 4: Kickstart IA — API route (generate plan)

**Files:**
- Modify: `lib/ai/prompts.ts`
- Create: `app/api/projects/kickstart/route.ts`
- Create: `lib/ai/kickstart.ts` (validation helper, testable)
- Create: `tests/lib/kickstart.test.ts`

- [ ] **Step 1: Write failing test for plan validation**

Create `tests/lib/kickstart.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseKickstartResponse } from '@/lib/ai/kickstart'

describe('parseKickstartResponse', () => {
  it('parses valid JSON plan', () => {
    const raw = JSON.stringify({
      name: 'Curso Test',
      type: 'lancamento',
      launch_date: '2026-06-01',
      phases: [
        {
          name: 'Pre-lancamento',
          order: 1,
          start_date: '2026-05-01',
          end_date: '2026-05-25',
          objective: 'Gerar leads',
          tasks: [
            { title: 'Pagina de captura', type: 'copy', due_date: '2026-05-10', priority: 'normal' }
          ]
        }
      ]
    })
    const result = parseKickstartResponse(raw)
    expect(result.name).toBe('Curso Test')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0].tasks).toHaveLength(1)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseKickstartResponse('not json')).toThrow('Invalid JSON')
  })

  it('throws when phases is missing', () => {
    expect(() => parseKickstartResponse(JSON.stringify({ name: 'x', type: 'lancamento' }))).toThrow('Missing phases')
  })

  it('strips markdown code fences if present', () => {
    const raw = '```json\n{"name":"x","type":"lancamento","launch_date":"2026-06-01","phases":[]}\n```'
    const result = parseKickstartResponse(raw)
    expect(result.name).toBe('x')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /tmp/launchos-deploy && npx vitest run tests/lib/kickstart.test.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '@/lib/ai/kickstart'`

- [ ] **Step 3: Create lib/ai/kickstart.ts**

```typescript
import type { KickstartPlan } from '@/types'

export function parseKickstartResponse(raw: string): KickstartPlan {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Invalid JSON from AI response')
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON from AI response')
  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj.phases)) throw new Error('Missing phases in AI response')

  return obj as unknown as KickstartPlan
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /tmp/launchos-deploy && npx vitest run tests/lib/kickstart.test.ts 2>&1 | tail -10
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Add kickstart prompt to lib/ai/prompts.ts**

Append to the end of `lib/ai/prompts.ts`:

```typescript
export function kickstartFromDescriptionPrompt(description: string, today: string): string {
  return `Hoje é ${today}. O usuário descreveu o seguinte projeto de marketing digital:

"${description}"

Retorne APENAS um objeto JSON válido (sem markdown, sem explicações) com esta estrutura exata:

{
  "name": "nome do projeto",
  "type": "lancamento" | "perpetuo" | "low_ticket" | "campanha" | "outro",
  "launch_date": "YYYY-MM-DD",
  "phases": [
    {
      "name": "nome da fase",
      "order": 1,
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "objective": "objetivo da fase em uma frase",
      "tasks": [
        {
          "title": "título da tarefa",
          "type": "copy" | "design" | "trafego" | "estrategia" | "outro",
          "due_date": "YYYY-MM-DD",
          "priority": "normal" | "atencao" | "urgente"
        }
      ]
    }
  ]
}

Regras:
- Máximo 3 fases (Pré-projeto, Execução, Pós-projeto — adapte os nomes ao tipo)
- Máximo 8 tarefas por fase
- Distribua as datas a partir de hoje até a data do lançamento/conclusão
- Se o usuário não mencionou prazo, assuma 30 dias a partir de hoje
- Inclua apenas tarefas essenciais — sem fluff`
}

export function briefingPrompt(taskTitle: string, taskType: string, projectName: string, projectDescription: string): string {
  return `Gere um briefing completo e prático para a seguinte tarefa de marketing:

Projeto: ${projectName}
Contexto do projeto: ${projectDescription}
Tarefa: ${taskTitle}
Tipo: ${taskType}

O briefing deve conter:
1. Objetivo da tarefa (1-2 frases)
2. Entregável esperado (o que exatamente deve ser produzido)
3. Tom e estilo (baseado no tipo do projeto)
4. Pontos obrigatórios a cobrir
5. O que NÃO fazer
6. Referências ou exemplos sugeridos (genéricos, sem inventar URLs)

Seja direto, prático e específico. Máximo 300 palavras.`
}
```

- [ ] **Step 6: Create app/api/projects/kickstart/route.ts**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/ai/client'
import { SYSTEM_PROMPT, kickstartFromDescriptionPrompt } from '@/lib/ai/prompts'
import { parseKickstartResponse } from '@/lib/ai/kickstart'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { description, workspace_id } = await req.json()
  if (!description?.trim() || !workspace_id) {
    return NextResponse.json({ error: 'description and workspace_id are required' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'gestor') {
    return NextResponse.json({ error: 'Only gestores can create projects' }, { status: 403 })
  }

  const today = new Date().toISOString().split('T')[0]

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: kickstartFromDescriptionPrompt(description, today) }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const plan = parseKickstartResponse(rawText)
    return NextResponse.json({ plan })
  } catch (err) {
    console.error('[kickstart] parse error:', rawText)
    return NextResponse.json({ error: 'AI returned invalid plan. Please try again.' }, { status: 500 })
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/ai/kickstart.ts lib/ai/prompts.ts app/api/projects/kickstart/route.ts tests/lib/kickstart.test.ts
git commit -m "feat: kickstart IA API route — generate project plan from natural language description"
```

---

### Task 5: Kickstart confirm route — save plan to DB

**Files:**
- Create: `app/api/projects/kickstart/confirm/route.ts`

- [ ] **Step 1: Create the confirm route**

```typescript
// app/api/projects/kickstart/confirm/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { KickstartPlan } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan, workspace_id }: { plan: KickstartPlan; workspace_id: string } = await req.json()
  if (!plan || !workspace_id) {
    return NextResponse.json({ error: 'plan and workspace_id are required' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'gestor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Create project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      workspace_id,
      name: plan.name,
      type: plan.type,
      launch_date: plan.launch_date,
      status: 'ativo',
      created_by: user.id,
    })
    .select()
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: 'Failed to create project: ' + projectError?.message }, { status: 500 })
  }

  // Create phases and tasks in sequence
  for (const phaseData of plan.phases) {
    const { data: phase, error: phaseError } = await supabase
      .from('launch_phases')
      .insert({
        project_id: project.id,
        name: phaseData.name,
        order: phaseData.order,
        start_date: phaseData.start_date,
        end_date: phaseData.end_date,
        objective: phaseData.objective,
      })
      .select()
      .single()

    if (phaseError || !phase) {
      return NextResponse.json({ error: 'Failed to create phase: ' + phaseError?.message }, { status: 500 })
    }

    if (phaseData.tasks.length > 0) {
      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(
          phaseData.tasks.map((t) => ({
            phase_id: phase.id,
            project_id: project.id,
            workspace_id,
            title: t.title,
            type: t.type,
            due_date: t.due_date,
            priority: t.priority,
            status: 'a_fazer',
            created_by: user.id,
            depends_on: [],
          }))
        )

      if (tasksError) {
        return NextResponse.json({ error: 'Failed to create tasks: ' + tasksError.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ project_id: project.id })
}
```

- [ ] **Step 2: Test the confirm route manually**

After the Kickstart frontend is complete (Task 6), the end-to-end flow will test this. For now, verify it compiles:

```bash
cd /tmp/launchos-deploy && npx tsc --noEmit app/api/projects/kickstart/confirm/route.ts 2>&1
```

Expected: no errors (type errors would surface here if KickstartPlan fields don't match DB columns).

- [ ] **Step 3: Commit**

```bash
git add app/api/projects/kickstart/confirm/route.ts
git commit -m "feat: kickstart confirm route — persists AI-generated plan to Supabase"
```

---

### Task 6: Kickstart frontend — chat + plan preview

**Files:**
- Create: `app/(app)/projetos/novo/page.tsx`
- Create: `app/(app)/projetos/novo/KickstartChat.tsx`
- Create: `app/(app)/projetos/novo/PlanPreview.tsx`

- [ ] **Step 1: Create KickstartChat component**

Create `app/(app)/projetos/novo/KickstartChat.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { KickstartPlan } from '@/types'

interface KickstartChatProps {
  workspaceId: string
  onPlanGenerated: (plan: KickstartPlan) => void
}

export function KickstartChat({ workspaceId, onPlanGenerated }: KickstartChatProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/projects/kickstart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, workspace_id: workspaceId }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok || data.error) {
      setError(data.error ?? 'Erro ao gerar plano. Tente novamente.')
      return
    }

    onPlanGenerated(data.plan)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-violet-950/30 border border-violet-800/30 rounded-xl p-4">
        <p className="text-xs text-violet-400 font-semibold mb-1">🤖 LaunchOS IA</p>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Me conta sobre o projeto. Pode descrever à vontade — produto, público-alvo, prazo, equipe disponível, meta principal. Quanto mais contexto, melhor o plano.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          placeholder="Ex: Vou lançar um curso de Instagram para pequenos negócios. Lançamento em 30 dias. Tenho uma copy, um designer e um gestor de tráfego. Meta: 200 alunos a R$297."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="bg-[#0f0f13] border-white/10 resize-none text-sm"
          disabled={loading}
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button
          type="submit"
          disabled={loading || !description.trim()}
          className="w-full bg-violet-600 hover:bg-violet-700"
        >
          {loading ? '🤖 Gerando seu plano...' : 'Gerar plano com IA →'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create PlanPreview component**

Create `app/(app)/projetos/novo/PlanPreview.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { KickstartPlan } from '@/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TYPE_LABELS: Record<string, string> = {
  lancamento: 'Lançamento', perpetuo: 'Perpétuo',
  low_ticket: 'Low Ticket', campanha: 'Campanha', outro: 'Outro',
}

const TASK_TYPE_COLORS: Record<string, string> = {
  copy: 'text-blue-400', design: 'text-pink-400',
  trafego: 'text-amber-400', estrategia: 'text-emerald-400', outro: 'text-zinc-400',
}

interface PlanPreviewProps {
  plan: KickstartPlan
  workspaceId: string
  onBack: () => void
}

export function PlanPreview({ plan, workspaceId, onBack }: PlanPreviewProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalTasks = plan.phases.reduce((acc, p) => acc + p.tasks.length, 0)

  async function handleConfirm() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/projects/kickstart/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, workspace_id: workspaceId }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok || data.error) {
      setError(data.error ?? 'Erro ao criar projeto. Tente novamente.')
      return
    }

    router.push(`/projetos/${data.project_id}/kanban`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-[#17171f] border border-white/10 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{plan.name}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {TYPE_LABELS[plan.type]} · Data-chave: {format(parseISO(plan.launch_date), "dd 'de' MMM yyyy", { locale: ptBR })} · {totalTasks} tarefas
            </p>
          </div>
          <span className="text-xs bg-violet-950 text-violet-400 px-2 py-1 rounded-full font-semibold">
            {plan.phases.length} fases
          </span>
        </div>

        <div className="space-y-4">
          {plan.phases.map((phase) => (
            <div key={phase.order} className="border border-white/5 rounded-lg overflow-hidden">
              <div className="bg-white/5 px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">{phase.name}</span>
                <span className="text-xs text-zinc-500">
                  {format(parseISO(phase.start_date), 'dd/MM')} → {format(parseISO(phase.end_date), 'dd/MM')} · {phase.tasks.length} tarefas
                </span>
              </div>
              <div className="divide-y divide-white/5">
                {phase.tasks.map((task, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{task.title}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${TASK_TYPE_COLORS[task.type]}`}>{task.type}</span>
                      <span className="text-xs text-zinc-500">{format(parseISO(task.due_date), 'dd/MM')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 border-white/10" onClick={onBack} disabled={loading}>
          ← Refazer descrição
        </Button>
        <Button
          className="flex-1 bg-violet-600 hover:bg-violet-700"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Criando projeto...' : '✓ Aprovar e criar projeto →'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the page**

Create `app/(app)/projetos/novo/page.tsx`:

```tsx
'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useWorkspace } from '@/hooks/useWorkspace'
import { Topbar } from '@/components/layout/Topbar'
import { KickstartChat } from './KickstartChat'
import { PlanPreview } from './PlanPreview'
import type { KickstartPlan } from '@/types'

export default function NovoProjetoPage() {
  const { workspace } = useWorkspace()
  const [plan, setPlan] = useState<KickstartPlan | null>(null)

  return (
    <>
      <Topbar title="Novo Projeto" />
      <div className="flex-1 overflow-y-auto p-6">
        {!plan ? (
          <KickstartChat
            workspaceId={workspace?.id ?? ''}
            onPlanGenerated={setPlan}
          />
        ) : (
          <PlanPreview
            plan={plan}
            workspaceId={workspace?.id ?? ''}
            onBack={() => setPlan(null)}
          />
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Test the end-to-end flow**

Deploy and test manually:

```bash
cd /tmp/launchos-deploy && git add -A && git push origin main
```

After Vercel deploys (~1 min): open `https://launchos-deploy.vercel.app/projetos/novo`, describe a project, verify the plan is generated and the project appears in Kanban after confirmation.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/projetos/
git commit -m "feat: kickstart IA frontend — chat interface and plan preview with approval flow"
```

---

### Task 7: Kanban board

**Files:**
- Create: `components/kanban/KanbanCard.tsx`
- Create: `components/kanban/KanbanColumn.tsx`
- Create: `components/kanban/KanbanBoard.tsx`
- Create: `app/(app)/projetos/[id]/kanban/page.tsx`
- Create: `app/(app)/projetos/[id]/kanban/actions.ts`

- [ ] **Step 1: Install @dnd-kit**

```bash
cd /tmp/launchos-deploy && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: package added to package.json, no peer dependency errors.

- [ ] **Step 2: Create server action for status update**

Create `app/(app)/projetos/[id]/kanban/actions.ts`:

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import type { TaskStatus } from '@/types'

export async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 3: Create KanbanCard component**

Create `components/kanban/KanbanCard.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/types'
import { format, parseISO, isPast } from 'date-fns'

const ROLE_BORDER: Record<string, string> = {
  copy: 'border-l-blue-500',
  design: 'border-l-pink-500',
  trafego: 'border-l-amber-500',
  estrategia: 'border-l-emerald-500',
  outro: 'border-l-zinc-600',
  urgente: 'border-l-red-500',
}

const ROLE_TAG: Record<string, string> = {
  copy: 'bg-blue-950 text-blue-400',
  design: 'bg-pink-950 text-pink-400',
  trafego: 'bg-amber-950 text-amber-400',
  estrategia: 'bg-emerald-950 text-emerald-400',
  outro: 'bg-zinc-800 text-zinc-400',
}

interface KanbanCardProps {
  task: Task
  onBriefingRequest: (task: Task) => void
}

export function KanbanCard({ task, onBriefingRequest }: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const borderClass = task.priority === 'urgente'
    ? ROLE_BORDER.urgente
    : ROLE_BORDER[task.type] ?? ROLE_BORDER.outro

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isLate = task.due_date && isPast(parseISO(task.due_date)) && !['aprovado', 'concluido'].includes(task.status)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-[#1a1a2e] rounded-lg p-3 mb-2 border-l-[3px] ${borderClass} relative select-none cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-zinc-200 font-medium leading-snug flex-1">{task.title}</p>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
          className="text-zinc-600 hover:text-zinc-400 text-base leading-none mt-0.5 flex-shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ···
        </button>
      </div>

      {menuOpen && (
        <div
          className="absolute right-2 top-8 z-20 bg-[#0f0f13] border border-white/10 rounded-lg py-1 shadow-xl min-w-[160px]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onBriefingRequest(task) }}
          >
            🤖 Gerar Briefing IA
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${ROLE_TAG[task.type] ?? ROLE_TAG.outro}`}>
          {task.type}
        </span>
        {task.due_date && (
          <span className={`text-[10px] ${isLate ? 'text-red-400' : 'text-zinc-500'}`}>
            {isLate ? '⚠ ' : ''}{format(parseISO(task.due_date), 'dd/MM')}
          </span>
        )}
        {task.assignee && (
          <span className="ml-auto w-5 h-5 rounded-full bg-violet-950 text-violet-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
            {(task.assignee.full_name ?? task.assignee.email)[0].toUpperCase()}
          </span>
        )}
      </div>

      {task.status === 'em_andamento' && task.description && (
        <div className="mt-2 h-1 bg-zinc-800 rounded-full">
          <div className="h-1 bg-violet-600 rounded-full w-2/5" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create KanbanColumn component**

Create `components/kanban/KanbanColumn.tsx`:

```tsx
'use client'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task, TaskStatus } from '@/types'
import { KanbanCard } from './KanbanCard'

const COLUMN_STYLES: Record<TaskStatus, { title: string; titleClass: string }> = {
  a_fazer:               { title: 'A Fazer',            titleClass: 'text-zinc-400' },
  em_andamento:          { title: 'Em Andamento',        titleClass: 'text-blue-400' },
  em_revisao:            { title: 'Em Revisão',          titleClass: 'text-amber-400' },
  aguardando_aprovacao:  { title: 'Aprovação',           titleClass: 'text-violet-400' },
  aprovado:              { title: 'Aprovado',            titleClass: 'text-emerald-300' },
  concluido:             { title: 'Concluído',           titleClass: 'text-emerald-500' },
}

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onBriefingRequest: (task: Task) => void
}

export function KanbanColumn({ status, tasks, onBriefingRequest }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { status } })
  const { title, titleClass } = COLUMN_STYLES[status]

  return (
    <div
      ref={setNodeRef}
      className={`bg-[#17171f] rounded-xl p-3 border transition-colors min-h-[400px] ${isOver ? 'border-violet-500/40 bg-violet-950/10' : 'border-white/5'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold uppercase tracking-wider ${titleClass}`}>{title}</span>
        <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onBriefingRequest={onBriefingRequest} />
        ))}
      </SortableContext>
    </div>
  )
}
```

- [ ] **Step 5: Create KanbanBoard component**

Create `components/kanban/KanbanBoard.tsx`:

```tsx
'use client'
import { useState, useTransition } from 'react'
import { DndContext, closestCenter, DragEndEvent, DragOverEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { Task, TaskStatus, Phase } from '@/types'
import { KanbanColumn } from './KanbanColumn'
import { updateTaskStatus } from '@/app/(app)/projetos/[id]/kanban/actions'

const COLUMNS: TaskStatus[] = ['a_fazer', 'em_andamento', 'em_revisao', 'aguardando_aprovacao', 'concluido']

interface KanbanBoardProps {
  phases: Phase[]
  projectName: string
  daysToLaunch: number
}

export function KanbanBoard({ phases, projectName, daysToLaunch }: KanbanBoardProps) {
  const [activePhaseId, setActivePhaseId] = useState(phases[0]?.id ?? '')
  const [activeFilter, setActiveFilter] = useState<string>('todos')
  const [tasks, setTasks] = useState<Task[]>(phases.flatMap((p) => p.tasks ?? []))
  const [briefingTask, setBriefingTask] = useState<Task | null>(null)
  const [briefingContent, setBriefingContent] = useState<string | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [, startTransition] = useTransition()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const activePhase = phases.find((p) => p.id === activePhaseId)
  const phaseTasks = tasks.filter((t) => t.phase_id === activePhaseId)
  const filtered = activeFilter === 'todos' ? phaseTasks : phaseTasks.filter((t) => t.type === activeFilter)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const taskId = active.id as string
    const newStatus = over.data.current?.status as TaskStatus | undefined
    if (!newStatus) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t))
    startTransition(() => { updateTaskStatus(taskId, newStatus).catch(console.error) })
  }

  async function handleBriefingRequest(task: Task) {
    setBriefingTask(task)
    setBriefingContent(null)
    setBriefingLoading(true)
    const res = await fetch('/api/ai/briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: task.id, task_title: task.title, task_type: task.type, project_name: projectName }),
    })
    const data = await res.json()
    setBriefingLoading(false)
    setBriefingContent(data.briefing ?? data.error ?? 'Erro ao gerar briefing.')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Phase tabs + countdown */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {phases.map((phase) => (
          <button
            key={phase.id}
            onClick={() => setActivePhaseId(phase.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${activePhaseId === phase.id ? 'bg-violet-950 text-violet-400 border border-violet-700' : 'bg-[#17171f] text-zinc-400 border border-white/5 hover:border-zinc-600'}`}
          >
            {phase.name}
            <span className="ml-1.5 text-[10px] opacity-60">{(phase.tasks ?? []).length}</span>
          </button>
        ))}
        <div className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-800/30">
          {daysToLaunch > 0 ? `D-${daysToLaunch}` : daysToLaunch === 0 ? 'Hoje!' : `D+${Math.abs(daysToLaunch)}`}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['todos', 'copy', 'design', 'trafego', 'estrategia'].map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${activeFilter === f ? 'bg-violet-950 text-violet-400' : 'bg-[#17171f] text-zinc-500 hover:text-zinc-300'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Board */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-3 flex-1 overflow-x-auto">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={filtered.filter((t) => t.status === status)}
              onBriefingRequest={handleBriefingRequest}
            />
          ))}
        </div>
      </DndContext>

      {/* Briefing modal */}
      {briefingTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setBriefingTask(null)}>
          <div className="bg-[#17171f] border border-white/10 rounded-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">🤖 Briefing IA — {briefingTask.title}</h3>
              <button onClick={() => setBriefingTask(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            {briefingLoading ? (
              <p className="text-sm text-zinc-400 animate-pulse">Gerando briefing...</p>
            ) : (
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{briefingContent}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create the Kanban page**

Create `app/(app)/projetos/[id]/kanban/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { differenceInDays, parseISO } from 'date-fns'
import type { Phase, Task } from '@/types'

export default async function KanbanPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/onboarding')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', membership.workspace_id)
    .single()

  if (!project) notFound()

  const { data: phases } = await supabase
    .from('launch_phases')
    .select('*, tasks(*, assignee:profiles!assigned_to(full_name, email))')
    .eq('project_id', params.id)
    .order('order')

  const daysToLaunch = differenceInDays(parseISO(project.launch_date), new Date())

  return (
    <>
      <Topbar title={project.name} />
      <div className="flex-1 overflow-hidden p-6">
        <KanbanBoard
          phases={(phases ?? []) as (Phase & { tasks: Task[] })[]}
          projectName={project.name}
          daysToLaunch={daysToLaunch}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add components/kanban/ app/\(app\)/projetos/\[id\]/ package.json package-lock.json
git commit -m "feat: kanban board with drag-and-drop, phase tabs, role filters, and countdown"
```

---

### Task 8: Briefing IA per card — API route

**Files:**
- Create: `app/api/ai/briefing/route.ts`

- [ ] **Step 1: Create the briefing route**

```typescript
// app/api/ai/briefing/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/ai/client'
import { SYSTEM_PROMPT, briefingPrompt } from '@/lib/ai/prompts'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { task_id, task_title, task_type, project_name } = await req.json()
  if (!task_title || !task_type || !project_name) {
    return NextResponse.json({ error: 'task_title, task_type, and project_name are required' }, { status: 400 })
  }

  // Fetch project description from task if available
  let projectDescription = ''
  if (task_id) {
    const { data: task } = await supabase
      .from('tasks')
      .select('description, project_id')
      .eq('id', task_id)
      .single()

    if (task?.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('name, type')
        .eq('id', task.project_id)
        .single()
      if (project) projectDescription = `Tipo: ${project.type}`
    }
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: briefingPrompt(task_title, task_type, project_name, projectDescription),
    }],
  })

  const briefing = message.content[0].type === 'text' ? message.content[0].text : ''

  // Save briefing to task description
  if (task_id) {
    await supabase.from('tasks').update({ description: briefing }).eq('id', task_id)
  }

  return NextResponse.json({ briefing })
}
```

- [ ] **Step 2: Deploy and test full flow**

```bash
cd /tmp/launchos-deploy && git add app/api/ai/briefing/route.ts && git commit -m "feat: briefing IA route — generates and saves task briefing via Claude" && git push origin main
```

After deploy: open any project → Kanban → three-dot menu on a card → "Gerar Briefing IA" → verify briefing modal appears with content.

- [ ] **Step 3: Verify build passes**

```bash
cd /tmp/launchos-deploy && npx tsc --noEmit 2>&1
```

Expected: 0 errors.

---

## Self-Review Checklist

- [x] DB rename: `launches` → `projects` with expanded type ✓
- [x] `em_revisao` status added to tasks ✓
- [x] `project_templates` table created ✓
- [x] Types updated: `Launch` → `Project`, `KickstartPlan` interfaces ✓
- [x] Sidebar nav: `/lancamentos` → `/projetos` ✓
- [x] `LaunchCard` → `ProjectCard` with link to `/projetos/[id]/kanban` ✓
- [x] Dashboard uses `projects` table ✓
- [x] Kickstart API: natural language → structured JSON plan ✓
- [x] Confirm route: saves plan to DB (project + phases + tasks) ✓
- [x] Kickstart frontend: KickstartChat + PlanPreview ✓
- [x] Kanban: 5 columns by status, drag-and-drop, phase tabs, filters ✓
- [x] Briefing IA: per-card context menu → API → modal ✓
- [x] `launch_phases` table still named `launch_phases` (Supabase keeps it) — Task 1 migration uses `project_id` column rename but does NOT rename the table itself (it's an internal join table, renaming is optional and out of scope) ✓
