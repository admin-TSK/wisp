-- Track how much of the period fee has already been reported to Stripe.
--
-- Wisp now bills via Stripe Billing Meter events, which are ADDITIVE (summed
-- over the period). The daily rollup therefore reports only the delta since the
-- last report (current period fee - reported_fee), making repeated daily runs
-- idempotent instead of double-charging.
alter table billing_periods
  add column if not exists reported_fee numeric not null default 0;
