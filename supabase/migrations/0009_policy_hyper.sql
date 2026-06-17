-- Add hyper compression level (Headroom agent-90 + zero protection floor).

alter table policies drop constraint if exists policies_level_check;
alter table policies add constraint policies_level_check
  check (level in ('off', 'conservative', 'balanced', 'aggressive', 'hyper'));
