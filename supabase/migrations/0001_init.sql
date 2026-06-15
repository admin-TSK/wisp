-- Wisp control-plane schema. Multi-tenant; RLS added in 0002.
-- All tenant-scoped access is keyed on tenant_id.

-- Tenants and membership ----------------------------------------------------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table tenant_members (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null,                       -- Supabase auth user
  role text not null check (role in ('owner','admin','viewer')),
  primary key (tenant_id, user_id)
);

-- Enrolled endpoints --------------------------------------------------------
create table devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  enrolment_label text,                        -- friendly label, not a hostname requirement
  group_name text,                             -- for group-level policy
  agent_version text,
  headroom_version text,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);
create index devices_tenant_idx on devices (tenant_id);

-- Policy: compression aggressiveness per device or group --------------------
create table policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  scope text not null check (scope in ('tenant','group','device')),
  scope_ref text,                              -- group_name or device_id when not tenant-wide
  level text not null check (level in ('off','conservative','balanced','aggressive')),
  updated_at timestamptz not null default now()
);
create index policies_tenant_idx on policies (tenant_id);

-- Aggregate usage (PII-free; matches the telemetry contract) ----------------
create table usage_events (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  model text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  requests int not null,
  input_tokens_original bigint not null,
  input_tokens_compressed bigint not null,
  input_tokens_removed bigint not null,
  input_tokens_cache_read bigint not null default 0,
  output_tokens bigint not null,
  policy_level text not null,
  created_at timestamptz not null default now()
);
create index usage_events_tenant_window_idx on usage_events (tenant_id, window_start);

-- Global model rate card (seeded from provider pricing pages) ----------------
create table model_pricing (
  model text not null,
  provider text not null,                      -- openai | anthropic | google | xai | ...
  base_input_rate numeric not null,            -- $ per token, standard input
  cached_input_rate numeric not null,          -- $ per token, cache hit/read
  output_rate numeric not null,
  effective_date date not null,
  source_url text not null,                    -- auditability
  primary key (model, effective_date)
);

-- Per-tenant override of the rate card (their negotiated rate, optional) -----
create table pricing_config (
  tenant_id uuid not null references tenants(id) on delete cascade,
  model text not null,
  effective_input_rate numeric,                -- override base; null => fall back to model_pricing
  effective_cached_rate numeric,               -- override cache; null => fall back
  primary key (tenant_id, model)
);

-- Billing controls ----------------------------------------------------------
create table billing_config (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  take_rate numeric not null default 0.10,     -- Wisp's share of measured (net) savings
  monthly_cap numeric,                          -- hard ceiling on Wisp fee per period
  billing_enabled boolean not null default false, -- false during shadow period
  shadow_until timestamptz                      -- onboarding trust window
);

-- Computed billing periods (rollup target) ----------------------------------
create table billing_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_tokens_removed bigint not null,
  gross_savings numeric not null,              -- shown: tokens_removed * base_rate
  measured_savings numeric not null,           -- billed: net-of-cache
  wisp_fee numeric not null,                   -- min(measured_savings * take_rate, monthly_cap)
  status text not null default 'open' check (status in ('open','invoiced','paid')),
  stripe_invoice_id text,
  created_at timestamptz not null default now(),
  constraint billing_periods_tenant_period_uniq unique (tenant_id, period_start)
);
create index billing_periods_tenant_idx on billing_periods (tenant_id, period_start);

-- Device enrolment tokens (opaque bearer for telemetry ingest) --------------
create table enrolment_tokens (
  token_hash text primary key,                 -- store only a hash of the bearer token
  tenant_id uuid not null references tenants(id) on delete cascade,
  device_id uuid references devices(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index enrolment_tokens_tenant_idx on enrolment_tokens (tenant_id);
