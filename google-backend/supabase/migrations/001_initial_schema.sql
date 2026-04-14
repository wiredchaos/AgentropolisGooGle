-- ============================================================
-- NEURO METAX — Agentropolis Ecosystem
-- Supabase Schema Migration 001 — Initial Schema
--
-- Paste this entire file into Supabase SQL Editor and Run.
-- Covers: agent memory, GTM events, analytics, app registry,
--         workflows, leads, listicles, video queue, crawl jobs.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "vector";   -- pgvector for embeddings

-- ══════════════════════════════════════════════════════════════
-- 1. AGENT MEMORY
--    Persists RLM Orchestrator memories across sessions.
--    Replaces the in-memory MemoryService array.
-- ══════════════════════════════════════════════════════════════
create table if not exists agent_memories (
  id           uuid primary key default uuid_generate_v4(),
  app_id       text not null,
  content      text not null,
  embedding    vector(768),          -- Gemini embedding-001 dim
  provenance   text not null,
  created_at   timestamptz not null default now()
);

create index if not exists agent_memories_app_id_idx
  on agent_memories (app_id);

-- Cosine similarity search helper function
create or replace function search_memories(
  query_embedding vector(768),
  match_app_id    text,
  match_count     int default 5
)
returns table (
  id          uuid,
  content     text,
  provenance  text,
  similarity  float
)
language plpgsql
as $$
begin
  return query
  select
    m.id,
    m.content,
    m.provenance,
    1 - (m.embedding <=> query_embedding) as similarity
  from agent_memories m
  where m.app_id = match_app_id
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ══════════════════════════════════════════════════════════════
-- 2. AGENT RUNS
--    Logs every RLM orchestrator execution for analytics.
-- ══════════════════════════════════════════════════════════════
create table if not exists agent_runs (
  id                uuid primary key default uuid_generate_v4(),
  app_id            text not null,
  mode              text,
  prompt            text not null,
  answer            text,
  reasoning_summary text,
  next_action       text,
  confidence        float,
  duration_ms       int,
  created_at        timestamptz not null default now()
);

create index if not exists agent_runs_app_id_idx on agent_runs (app_id);
create index if not exists agent_runs_created_at_idx on agent_runs (created_at desc);

-- ══════════════════════════════════════════════════════════════
-- 3. GTM EVENTS
--    Fan-out distribution event log from GTM Core.
-- ══════════════════════════════════════════════════════════════
create table if not exists gtm_events (
  id           uuid primary key default uuid_generate_v4(),
  event_type   text not null,   -- workflow_triggered, distribution_event, etc.
  app_id       text,
  workflow_id  text,
  payload      jsonb,
  source       text,
  created_at   timestamptz not null default now()
);

create index if not exists gtm_events_event_type_idx on gtm_events (event_type);
create index if not exists gtm_events_created_at_idx on gtm_events (created_at desc);

-- ══════════════════════════════════════════════════════════════
-- 4. GTM DISTRIBUTION LOG
--    Tracks per-app results of each distribute() call.
-- ══════════════════════════════════════════════════════════════
create table if not exists gtm_distribution_log (
  id           uuid primary key default uuid_generate_v4(),
  event_id     uuid references gtm_events(id) on delete cascade,
  target_app   text not null,
  target_url   text not null,
  success      boolean not null,
  status_code  int,
  error        text,
  created_at   timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════════
-- 5. APP REGISTRY
--    Canonical list of all Agentropolis ecosystem apps.
-- ══════════════════════════════════════════════════════════════
create table if not exists app_registry (
  id           text primary key,
  name         text not null,
  url          text not null,
  description  text,
  layer        text not null,
  tags         text[] default '{}',
  gtm_roles    text[] default '{}',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Seed with the full ecosystem
insert into app_registry (id, name, url, description, layer, tags, gtm_roles) values
  ('neurometax',         'NEURO METAX Studio',          'https://neurometax.com',                                                       'Parent brand studio.',                                               'hub',            array['studio','brand'],          array['brand','content','distribution']),
  ('agentropolis-city',  'Agentropolis City',            'https://agentropolis.vercel.app',                                              'Sovereign cyber city on BASE.',                                      'infrastructure', array['web3','defi','base'],       array['infrastructure','chain','incentive']),
  ('chaosrank',          'Chaos Rank',                   'https://chaosrank.vercel.app',                                                  '$CHAOS token incentive ranking.',                                    'incentive',      array['token','ranking'],          array['incentive','analytics','distribution']),
  ('agentseatbelt',      'Agent Seatbelt',               'https://agentseatbelt.vercel.app',                                              'Constitutional safety layer.',                                       'safety',         array['safety','claw','policy'],   array['safety','infrastructure','distribution']),
  ('agentropolis-portal','Agentropolis Portal',          'https://agentropolis.lovable.app',                                              'City portal UI.',                                                    'infrastructure', array['portal','city'],            array['distribution','community']),
  ('agentropolis-omni',  'Agentropolis Omni',            'https://agentropolisomni.lovable.app',                                          'Omnichain layer.',                                                   'chain',          array['omnichain','interop'],      array['chain','infrastructure']),
  ('school-of-base',     'School of Base',               'https://schoolofbase.lovable.app',                                              'Builder readiness education platform.',                              'education',      array['education','base'],         array['education','community','lead-gen']),
  ('agent-social',       'Agent Social Systems',         'https://agentsocialsystems.lovable.app',                                        'Social agent coordination.',                                         'social',         array['social','agents'],          array['social','distribution','community']),
  ('social-magnet',      'Social Magnet',                'https://socialmagnet.lovable.app',                                              'Magnetic content amplification.',                                    'social',         array['social','content'],         array['social','content','distribution']),
  ('nexus-publica',      'Nexus Publica',                'https://nexuspublica.lovable.app',                                              'Public intelligence layer.',                                         'intelligence',   array['intelligence','public'],    array['intelligence','analytics','distribution']),
  ('gtmflow-os',         'GTMFlow OS',                   'https://gtmflow-frontend.vercel.app',                                           'MCP-powered GTM workflow engine.',                                   'gtm-core',       array['gtm','workflows','mcp'],    array['gtm-core','automation','distribution','content','analytics']),
  ('ddb2b',              'Dogs B2B Growth',              'https://ddb2b.lovable.app',                                                     'AI-powered B2B pipeline acceleration.',                              'b2b',            array['b2b','growth','pipeline'],  array['b2b','lead-gen','sales']),
  ('atv-network',        'ATV Network',                  'https://atvnetwork.vercel.app',                                                 'Blink-based decentralized media network.',                           'media',          array['media','blink','solana'],   array['media','content','distribution']),
  ('cortex-city',        'Cortex City 3D',               'https://omma.build/p/remix-cortex-city-3d-qx8nw8',                             '3D cyberpunk city experience.',                                      'experience',     array['3d','game','city'],         array['experience','community','brand']),
  ('tower-defense',      'Tower Defense',                'https://omma.build/p/vary-futuristic-tower-defense-isometric--eog8gn',         'Isometric tower defense.',                                           'experience',     array['game','isometric'],         array['experience','community','incentive']),
  ('browser-ops',        'Browser Ops',                  'https://omma.build/p/browser-ops-execution-spec-s0yhrd',                       'Browser agent operations.',                                          'infrastructure', array['browser','automation'],     array['infrastructure','automation']),
  ('remix-car',          'Remix Car Game',               'https://omma.build/p/remix-car-game-rtnpih',                                   'Remix-powered racing game.',                                         'experience',     array['game','remix'],             array['experience','community'])
on conflict (id) do update
  set name = excluded.name,
      url  = excluded.url,
      updated_at = now();

-- ══════════════════════════════════════════════════════════════
-- 6. GTM WORKFLOWS
-- ══════════════════════════════════════════════════════════════
create table if not exists gtm_workflows (
  id           text primary key,
  name         text not null,
  description  text,
  target_roles text[] default '{}',
  trigger      text not null,
  risk         text not null default 'low',
  enabled      boolean not null default true,
  run_count    int not null default 0,
  last_run_at  timestamptz,
  created_at   timestamptz not null default now()
);

insert into gtm_workflows (id, name, description, target_roles, trigger, risk) values
  ('gtm-w1', 'Universal Content Blast',       'Syndicate content to all distribution-layer apps.',     array['content','distribution','social'],     'on_publish',   'low'),
  ('gtm-w2', 'Web3 Lead Funnel',              'Route Web2 B2B leads through onboarding.',             array['lead-gen','education','b2b'],           'on_signup',    'medium'),
  ('gtm-w3', 'Agent Deployment Signal',       'Broadcast new agent deployment.',                      array['infrastructure','safety','incentive'],  'on_deploy',    'high'),
  ('gtm-w4', 'Social Amplification Loop',     'Fan out via Social Magnet + Agent Social.',            array['social','community'],                   'on_publish',   'low'),
  ('gtm-w5', 'Ecosystem Intelligence Digest', 'Weekly signal aggregation.',                           array['intelligence','analytics'],             'weekly',       'low'),
  ('gtm-w6', 'B2B Pipeline Activation',       'Trigger B2B growth sequences.',                        array['b2b','sales'],                          'on_signal',    'medium'),
  ('gtm-w7', 'Chaos Rank Incentive',          'Push $CHAOS reward events.',                           array['incentive','experience','community'],   'on_action',    'low'),
  ('gtm-w8', 'Full Ecosystem Broadcast',      'Broadcast to every active app.',                       array['distribution'],                         'manual',       'high')
on conflict (id) do nothing;

-- ══════════════════════════════════════════════════════════════
-- 7. LEADS
--    B2B and Web3 inbound leads across all apps.
-- ══════════════════════════════════════════════════════════════
create table if not exists leads (
  id           uuid primary key default uuid_generate_v4(),
  email        text,
  name         text,
  company      text,
  source_app   text not null,
  vertical     text,
  stage        text not null default 'new',   -- new, contacted, qualified, closed
  notes        text,
  metadata     jsonb default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists leads_source_app_idx on leads (source_app);
create index if not exists leads_stage_idx on leads (stage);
create index if not exists leads_created_at_idx on leads (created_at desc);

-- ══════════════════════════════════════════════════════════════
-- 8. LISTICLES
--    Listicle Intelligence Engine output.
-- ══════════════════════════════════════════════════════════════
create table if not exists listicles (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  industry     text not null,
  item_count   int not null,
  platforms    text[] default '{}',
  status       text not null default 'draft',   -- draft, syndicated, archived
  content      jsonb,                            -- optional: full item list
  created_at   timestamptz not null default now()
);

create index if not exists listicles_industry_idx on listicles (industry);
create index if not exists listicles_status_idx on listicles (status);

-- ══════════════════════════════════════════════════════════════
-- 9. VIDEO GENERATION QUEUE
--    Higgsfield / Seedance 2.0 job tracking.
-- ══════════════════════════════════════════════════════════════
create table if not exists video_queue (
  id           uuid primary key default uuid_generate_v4(),
  product_url  text not null,
  format       text not null,   -- ugc, unboxing, tv_spot, etc.
  status       text not null default 'pending',  -- pending, generating, ready, failed
  cost_usd     float not null default 0.347,
  result_url   text,
  error        text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists video_queue_status_idx on video_queue (status);
create index if not exists video_queue_created_at_idx on video_queue (created_at desc);

-- ══════════════════════════════════════════════════════════════
-- 10. CRAWL JOBS
--     Cloudflare browser rendering crawl tracking.
-- ══════════════════════════════════════════════════════════════
create table if not exists crawl_jobs (
  id           uuid primary key default uuid_generate_v4(),
  url          text not null,
  status       text not null default 'pending',  -- pending, running, completed, failed
  result       text,
  error        text,
  submitted_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
--    Service role key bypasses RLS (used by Edge Functions).
--    Anonymous users get read access to registry + workflows.
-- ══════════════════════════════════════════════════════════════
alter table app_registry       enable row level security;
alter table gtm_workflows      enable row level security;
alter table agent_memories     enable row level security;
alter table agent_runs         enable row level security;
alter table gtm_events         enable row level security;
alter table gtm_distribution_log enable row level security;
alter table leads              enable row level security;
alter table listicles          enable row level security;
alter table video_queue        enable row level security;
alter table crawl_jobs         enable row level security;

-- Public read on registry and workflows (needed by frontend apps)
create policy "public_read_registry"   on app_registry   for select using (true);
create policy "public_read_workflows"  on gtm_workflows   for select using (true);
create policy "public_read_listicles"  on listicles       for select using (status = 'syndicated');

-- Service role (Edge Functions) gets full access — no policy needed,
-- service role key bypasses RLS automatically.
