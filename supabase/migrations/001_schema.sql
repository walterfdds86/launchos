-- Enable UUID
create extension if not exists "pgcrypto";

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Workspaces
create table workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);
alter table workspaces enable row level security;

-- Workspace Members
create table workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('gestor','copy','designer','trafego','observador')),
  joined_at timestamptz default now(),
  primary key (workspace_id, user_id)
);
alter table workspace_members enable row level security;

-- RLS: workspace access
create policy "Members can read their workspaces" on workspaces
  for select using (
    exists (select 1 from workspace_members where workspace_id = workspaces.id and user_id = auth.uid())
  );
create policy "Members can read workspace_members" on workspace_members
  for select using (
    exists (select 1 from workspace_members wm where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid())
  );

-- Launches
create table launches (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('curso','mentoria','webinar','ebook','evento','outro')),
  launch_date date not null,
  status text not null default 'ativo' check (status in ('rascunho','ativo','concluido','pausado')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table launches enable row level security;
create policy "Workspace members can read launches" on launches
  for select using (
    exists (select 1 from workspace_members where workspace_id = launches.workspace_id and user_id = auth.uid())
  );
create policy "Gestores can insert launches" on launches
  for insert with check (
    exists (select 1 from workspace_members where workspace_id = launches.workspace_id and user_id = auth.uid() and role = 'gestor')
  );
create policy "Gestores can update launches" on launches
  for update using (
    exists (select 1 from workspace_members where workspace_id = launches.workspace_id and user_id = auth.uid() and role = 'gestor')
  );

-- Phases
create table launch_phases (
  id uuid default gen_random_uuid() primary key,
  launch_id uuid references launches(id) on delete cascade not null,
  name text not null,
  "order" int not null,
  start_date date,
  end_date date,
  objective text
);
alter table launch_phases enable row level security;
create policy "Workspace members can read phases" on launch_phases
  for select using (
    exists (
      select 1 from launches l
      join workspace_members wm on wm.workspace_id = l.workspace_id
      where l.id = launch_phases.launch_id and wm.user_id = auth.uid()
    )
  );
create policy "Gestores can manage phases" on launch_phases
  for all using (
    exists (
      select 1 from launches l
      join workspace_members wm on wm.workspace_id = l.workspace_id
      where l.id = launch_phases.launch_id and wm.user_id = auth.uid() and wm.role = 'gestor'
    )
  );

-- Tasks
create table tasks (
  id uuid default gen_random_uuid() primary key,
  phase_id uuid references launch_phases(id) on delete cascade not null,
  launch_id uuid references launches(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  title text not null,
  description text,
  type text not null default 'outro' check (type in ('copy','design','trafego','estrategia','outro')),
  assigned_to uuid references profiles(id),
  status text not null default 'a_fazer' check (status in ('a_fazer','em_andamento','aguardando_aprovacao','aprovado','concluido')),
  priority text not null default 'normal' check (priority in ('normal','atencao','urgente','bloqueada')),
  due_date date,
  completed_at timestamptz,
  depends_on uuid[] default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table tasks enable row level security;
create policy "Workspace members can read tasks" on tasks
  for select using (
    exists (select 1 from workspace_members where workspace_id = tasks.workspace_id and user_id = auth.uid())
  );
create policy "Members can update their own tasks" on tasks
  for update using (
    exists (select 1 from workspace_members where workspace_id = tasks.workspace_id and user_id = auth.uid())
    and tasks.assigned_to = auth.uid()
  );
create policy "Gestores can manage all tasks" on tasks
  for all using (
    exists (select 1 from workspace_members where workspace_id = tasks.workspace_id and user_id = auth.uid() and role = 'gestor')
  );

-- Auto-update updated_at
create function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at();

-- Checklist Items
create table checklist_items (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  label text not null,
  completed boolean default false,
  "order" int not null default 0
);
alter table checklist_items enable row level security;
create policy "Workspace members can manage checklist" on checklist_items
  for all using (
    exists (
      select 1 from tasks t
      join workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = checklist_items.task_id and wm.user_id = auth.uid()
    )
  );

-- Task Comments
create table task_comments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);
alter table task_comments enable row level security;
create policy "Workspace members can manage comments" on task_comments
  for all using (
    exists (
      select 1 from tasks t
      join workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_comments.task_id and wm.user_id = auth.uid()
    )
  );

-- Approvals
create table approvals (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  requested_by uuid references profiles(id) not null,
  reviewed_by uuid references profiles(id),
  status text not null default 'pendente' check (status in ('pendente','aprovado','revisao')),
  feedback text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);
alter table approvals enable row level security;
create policy "Workspace members can read approvals" on approvals
  for select using (
    exists (
      select 1 from tasks t
      join workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = approvals.task_id and wm.user_id = auth.uid()
    )
  );
create policy "Members can request approval" on approvals
  for insert with check (auth.uid() = requested_by);
create policy "Gestores can review approvals" on approvals
  for update using (
    exists (
      select 1 from tasks t
      join workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = approvals.task_id and wm.user_id = auth.uid() and wm.role = 'gestor'
    )
  );

-- Daily Focus (AI)
create table daily_focus (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  tasks_json jsonb not null default '[]',
  ai_message text not null,
  created_at timestamptz default now(),
  unique (workspace_id, user_id, date)
);
alter table daily_focus enable row level security;
create policy "Users can read own daily focus" on daily_focus
  for select using (auth.uid() = user_id);
create policy "System can insert daily focus" on daily_focus
  for insert with check (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table approvals;
