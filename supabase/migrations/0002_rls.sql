-- Row-level security: a row is visible only to members of its tenant.
-- The telemetry/enrol ingest paths run under the service role and set tenant_id
-- from the authenticated enrolment token, never from the request body.

alter table tenants enable row level security;
alter table tenant_members enable row level security;
alter table devices enable row level security;
alter table policies enable row level security;
alter table usage_events enable row level security;
alter table pricing_config enable row level security;
alter table billing_config enable row level security;
alter table billing_periods enable row level security;
alter table enrolment_tokens enable row level security;
alter table model_pricing enable row level security;

-- Membership helper lives in a NON-exposed `private` schema so it is not callable
-- via PostgREST RPC. It is SECURITY DEFINER to bypass RLS on tenant_members and
-- avoid policy recursion. Only `authenticated` may execute it (RLS policies do).
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_tenant_member(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tenant_members m
    where m.tenant_id = t and m.user_id = auth.uid()
  );
$$;
revoke execute on function private.is_tenant_member(uuid) from public, anon;
grant execute on function private.is_tenant_member(uuid) to authenticated;

-- Per-tenant read policies.
create policy tenants_member_select on tenants
  for select using (private.is_tenant_member(id));
create policy members_select on tenant_members
  for select using (private.is_tenant_member(tenant_id));
create policy devices_select on devices
  for select using (private.is_tenant_member(tenant_id));
create policy policies_select on policies
  for select using (private.is_tenant_member(tenant_id));
create policy usage_events_select on usage_events
  for select using (private.is_tenant_member(tenant_id));
create policy pricing_config_select on pricing_config
  for select using (private.is_tenant_member(tenant_id));
create policy billing_config_select on billing_config
  for select using (private.is_tenant_member(tenant_id));
create policy billing_periods_select on billing_periods
  for select using (private.is_tenant_member(tenant_id));

-- Admins/owners can change policy and pricing for their tenant.
create policy policies_write on policies
  for all using (private.is_tenant_member(tenant_id)) with check (private.is_tenant_member(tenant_id));
create policy pricing_config_write on pricing_config
  for all using (private.is_tenant_member(tenant_id)) with check (private.is_tenant_member(tenant_id));

-- model_pricing is global, read-only reference data.
create policy model_pricing_read on model_pricing
  for select using (true);

-- enrolment_tokens: intentionally NO policy => deny-all to anon/authenticated.
-- Ingest paths use the service role, which bypasses RLS.
comment on table enrolment_tokens is
  'Service-role only by design: RLS enabled with no policy = deny-all to anon/authenticated.';
