-- Hot-path indexes for session resolution and Stripe webhook reconciliation.

create index if not exists tenant_members_user_idx on tenant_members (user_id);

create index if not exists billing_config_stripe_customer_idx
  on billing_config (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists billing_periods_stripe_invoice_idx
  on billing_periods (stripe_invoice_id)
  where stripe_invoice_id is not null;
