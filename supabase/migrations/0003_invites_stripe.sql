-- Team invites + Stripe customer id on billing_config.

alter table billing_config
  add column if not exists stripe_customer_id text;

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'viewer')),
  token_hash text not null unique,
  invited_by uuid not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invites_tenant_idx on invites (tenant_id);
create unique index if not exists invites_tenant_email_pending_idx
  on invites (tenant_id, lower(email))
  where accepted_at is null;

alter table invites enable row level security;

create policy invites_select on invites
  for select using (private.is_tenant_member(tenant_id));

create policy invites_write on invites
  for all using (private.is_tenant_member(tenant_id))
  with check (private.is_tenant_member(tenant_id));

-- Accept flow uses service role to validate token hash and insert membership.
