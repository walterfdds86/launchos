export type WorkspaceRole = 'gestor' | 'copy' | 'designer' | 'trafego' | 'observador'

export type TaskStatus =
  | 'a_fazer'
  | 'em_andamento'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'concluido'

export type TaskPriority = 'normal' | 'atencao' | 'urgente' | 'bloqueada'

export type TaskType = 'copy' | 'design' | 'trafego' | 'estrategia' | 'outro'

export type LaunchType = 'curso' | 'mentoria' | 'webinar' | 'ebook' | 'evento' | 'outro'

export type LaunchStatus = 'rascunho' | 'ativo' | 'concluido' | 'pausado'

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
}

export interface Launch {
  id: string
  workspace_id: string
  name: string
  type: LaunchType
  launch_date: string
  status: LaunchStatus
  created_by: string
  created_at: string
  phases?: Phase[]
}

export interface Phase {
  id: string
  launch_id: string
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
  launch_id: string
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
  task?: Task & { phase?: Phase & { launch?: Launch } }
  requester?: { full_name: string | null; email: string }
}

export interface DailyFocus {
  id: string
  workspace_id: string
  user_id: string
  date: string
  tasks_json: string[]
  ai_message: string
  created_at: string
}
