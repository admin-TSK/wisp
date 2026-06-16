-- RLS / authorization gate (plain SQL, no pgTAP dependency) so it runs against a
-- stock Postgres service in CI. Each check RAISEs on failure; psql ON_ERROR_STOP
-- turns any raise into a non-zero exit.
--
-- Proves the boundaries the security review tightened: cross-tenant isolation,
-- viewer write denial (role-aware policies), pricing_config locked to the
-- service role, and enrol_secrets deny-all to authenticated.
--
-- The CI job pre-creates an `auth.uid()` shim (reads request.jwt.claims->>'sub')
-- and the anon/authenticated roles, then applies all migrations, then runs this.

\set ON_ERROR_STOP on
begin;

-- Fixtures (as the superuser; RLS bypassed). No auth.users needed —
-- private.is_tenant_member only reads tenant_members.
insert into tenants (id, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Tenant A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Tenant B');

insert into tenant_members (tenant_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'viewer'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '55555555-5555-4555-8555-555555555555', 'admin'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '33333333-3333-4333-8333-333333333333', 'owner');

insert into devices (id, tenant_id, enrolment_label) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'device-a');

insert into policies (tenant_id, scope, level) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'tenant', 'aggressive');

insert into enrol_secrets (secret_hash, tenant_id) values
  ('deadbeefhash', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

-- Act as authenticated users from here on.
set local role authenticated;

-- C1: owner of A can read A's policy.
set local request.jwt.claims to '{"sub":"11111111-1111-4111-8111-111111111111"}';
do $$ begin
  if (select count(*) from policies where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 1
    then raise exception 'C1 failed: owner cannot read own policy'; end if;
end $$;

-- C2: cross-tenant isolation — a member of B cannot read A's policy.
set local request.jwt.claims to '{"sub":"33333333-3333-4333-8333-333333333333"}';
do $$ begin
  if (select count(*) from policies where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 0
    then raise exception 'C2 failed: cross-tenant policy read leaked'; end if;
end $$;

-- C3: viewer of A cannot write policy (owner/admin only).
set local request.jwt.claims to '{"sub":"22222222-2222-4222-8222-222222222222"}';
do $$
declare denied boolean := false;
begin
  begin
    insert into policies (tenant_id, scope, level)
      values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'group', 'off');
  exception when others then denied := true;
  end;
  if not denied then raise exception 'C3 failed: viewer was able to write policy'; end if;
end $$;

-- C4: owner of A can write policy.
set local request.jwt.claims to '{"sub":"11111111-1111-4111-8111-111111111111"}';
insert into policies (tenant_id, scope, level)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'group', 'balanced');

-- C5: pricing_config is service-role only — even an owner cannot write it.
do $$
declare denied boolean := false;
begin
  begin
    insert into pricing_config (tenant_id, model, effective_input_rate)
      values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'gpt-5', 0);
  exception when others then denied := true;
  end;
  if not denied then raise exception 'C5 failed: pricing_config was tenant-writable'; end if;
end $$;

-- C6: enrol_secrets is deny-all to authenticated (RLS on, no policy).
do $$ begin
  if (select count(*) from enrol_secrets) <> 0
    then raise exception 'C6 failed: enrol_secrets readable by authenticated'; end if;
end $$;

-- C7: viewer of A cannot create invites (owner/admin only).
do $$
declare denied boolean := false;
begin
  begin
    insert into invites (tenant_id, email, role, token_hash, invited_by, expires_at)
      values (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'x@example.com',
        'viewer',
        'abc',
        '22222222-2222-4222-8222-222222222222',
        now() + interval '7 days'
      );
  exception when others then denied := true;
  end;
  if not denied then raise exception 'C7 failed: viewer was able to write invites'; end if;
end $$;

-- C8: enrolment_tokens is deny-all to authenticated.
do $$ begin
  if (select count(*) from enrolment_tokens) <> 0
    then raise exception 'C8 failed: enrolment_tokens readable by authenticated'; end if;
end $$;

-- C9: cross-tenant isolation — member of B cannot read A's devices.
set local request.jwt.claims to '{"sub":"33333333-3333-4333-8333-333333333333"}';
do $$ begin
  if (select count(*) from devices where tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 0
    then raise exception 'C9 failed: cross-tenant device read leaked'; end if;
end $$;

-- C10: admin of A can write policy.
set local request.jwt.claims to '{"sub":"55555555-5555-4555-8555-555555555555"}';
insert into policies (tenant_id, scope, level)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'group', 'conservative');

rollback;

\echo 'RLS checks passed (C1-C10).'
