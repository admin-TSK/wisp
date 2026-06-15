-- Per-tenant enrolment secrets (replaces a single global WISP_ENROL_SECRET).
--
-- /api/enrol resolves the tenant by matching the presented secret's hash, so a
-- given secret can only enrol devices into its OWN tenant. Previously one global
-- secret + a body-supplied tenant_id let any holder enrol into any tenant.
--
-- Rotation: issue a new secret, then revoke the old (revoked_at). Only the hash
-- is ever stored; the plaintext is shown once at creation.
create table if not exists enrol_secrets (
  secret_hash text primary key,                -- sha256(plaintext secret)
  tenant_id uuid not null references tenants(id) on delete cascade,
  label text,                                  -- e.g. 'jamf-2026' for rotation hygiene
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists enrol_secrets_tenant_idx on enrol_secrets (tenant_id);

alter table enrol_secrets enable row level security;

-- Service-role only by design (like enrolment_tokens): RLS enabled with NO
-- policy = deny-all to anon/authenticated. The enrol route uses the service role.
comment on table enrol_secrets is
  'Service-role only by design: RLS enabled with no policy = deny-all to anon/authenticated.';
