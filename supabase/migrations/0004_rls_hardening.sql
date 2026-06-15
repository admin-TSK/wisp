-- Role-aware writes + lock pricing_config to the service role.
--
-- Closes two gaps from the security review:
--   1. Write policies granted access to ANY tenant member (incl. 'viewer'); the
--      UI checked roles but a direct PostgREST call bypassed that check.
--   2. pricing_config is a BILLING INPUT yet was tenant-writable, so a customer
--      could lower their own Wisp fee by writing rate overrides.

-- Role helper: SECURITY DEFINER so it can read tenant_members under RLS without
-- recursion. Lives in the non-exposed `private` schema (not callable via RPC),
-- mirroring private.is_tenant_member from 0002.
create or replace function private.has_tenant_role(t uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tenant_members m
    where m.tenant_id = t
      and m.user_id = auth.uid()
      and m.role = any(roles)
  );
$$;
revoke execute on function private.has_tenant_role(uuid, text[]) from public, anon;
grant execute on function private.has_tenant_role(uuid, text[]) to authenticated;

-- policies: only owner/admin may write; viewers remain read-only (the select
-- policy from 0002 is unchanged).
drop policy if exists policies_write on policies;
create policy policies_write on policies
  for all
  using (private.has_tenant_role(tenant_id, array['owner', 'admin']))
  with check (private.has_tenant_role(tenant_id, array['owner', 'admin']));

-- pricing_config: service-role ONLY. Drop the tenant write policy entirely.
-- RLS stays enabled with just the select policy (members can read their
-- negotiated rates) and no write policy => no anon/authenticated writes. Wisp
-- sets negotiated overrides server-side, exactly like billing_config.
drop policy if exists pricing_config_write on pricing_config;

-- invites (from 0003): only owner/admin may create/revoke invites.
drop policy if exists invites_write on invites;
create policy invites_write on invites
  for all
  using (private.has_tenant_role(tenant_id, array['owner', 'admin']))
  with check (private.has_tenant_role(tenant_id, array['owner', 'admin']));
