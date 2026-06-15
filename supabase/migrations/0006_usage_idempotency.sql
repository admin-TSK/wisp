-- Idempotent telemetry ingest: a retried batch cannot double-count.
--
-- The agent now tags each batch with a stable batch_id and reuses it on retry
-- (at-least-once delivery). (batch_id, model) is the natural idempotency key
-- because the agent emits exactly one event per model per batch. The ingest
-- route upserts with ON CONFLICT DO NOTHING on this key.
alter table usage_events
  add column if not exists batch_id uuid;

-- Plain (non-partial) unique index so `ON CONFLICT (batch_id, model)` can infer
-- it — a partial index would NOT be matched by the upsert. Legacy rows have a
-- NULL batch_id and NULLs are distinct under a standard unique index, so any
-- number of them coexist; only non-null batch_ids are deduped.
create unique index if not exists usage_events_batch_model_uniq
  on usage_events (batch_id, model);
