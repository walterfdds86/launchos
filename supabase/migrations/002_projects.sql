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

-- Update RLS policies that reference old name
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
