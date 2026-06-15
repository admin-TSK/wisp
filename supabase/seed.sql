-- Model rate card seed (June 2026 list prices). $/token = ($/1M) / 1e6.
-- Where a provider's cache rate is unknown, cached_input_rate == base_input_rate
-- (conservative: assumes no cache discount). effective_date + source_url make
-- every billed figure traceable to a dated source.

insert into model_pricing (model, provider, base_input_rate, cached_input_rate, output_rate, effective_date, source_url) values
  -- OpenAI (https://openai.com/api/pricing/)
  ('gpt-5.5',        'openai',    5.00/1e6, 0.50/1e6,  30.00/1e6, '2026-06-01', 'https://openai.com/api/pricing/'),
  ('gpt-5.4',        'openai',    2.50/1e6, 0.25/1e6,  15.00/1e6, '2026-06-01', 'https://openai.com/api/pricing/'),
  ('gpt-5.4-mini',   'openai',    0.75/1e6, 0.075/1e6,  4.50/1e6, '2026-06-01', 'https://openai.com/api/pricing/'),
  ('gpt-5.2-codex',  'openai',    1.75/1e6, 1.75/1e6,  14.00/1e6, '2026-06-01', 'https://openai.com/api/pricing/'),
  ('gpt-5',          'openai',    1.25/1e6, 1.25/1e6,  10.00/1e6, '2026-06-01', 'https://openai.com/api/pricing/'),
  ('gpt-5-mini',     'openai',    0.25/1e6, 0.25/1e6,   2.00/1e6, '2026-06-01', 'https://openai.com/api/pricing/'),
  ('gpt-4o',         'openai',    2.50/1e6, 2.50/1e6,  10.00/1e6, '2026-06-01', 'https://openai.com/api/pricing/'),
  -- Anthropic (https://platform.claude.com/docs/en/about-claude/pricing)
  ('claude-opus-4-8','anthropic', 5.00/1e6, 0.50/1e6,  25.00/1e6, '2026-06-01', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('claude-opus-4-7','anthropic', 5.00/1e6, 0.50/1e6,  25.00/1e6, '2026-06-01', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('claude-sonnet-4-6','anthropic',3.00/1e6,0.30/1e6,  15.00/1e6, '2026-06-01', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('claude-haiku-4-5','anthropic',1.00/1e6, 0.10/1e6,   5.00/1e6, '2026-06-01', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('claude-fable-5', 'anthropic',10.00/1e6, 1.00/1e6,  50.00/1e6, '2026-06-01', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  -- Google
  ('gemini-3.1-pro', 'google',    2.00/1e6, 2.00/1e6,  12.00/1e6, '2026-06-01', 'https://ai.google.dev/pricing'),
  ('gemini-3.5-flash','google',   1.50/1e6, 0.15/1e6,   9.00/1e6, '2026-06-01', 'https://ai.google.dev/pricing'),
  ('gemini-2.5-pro', 'google',    1.25/1e6, 1.25/1e6,  10.00/1e6, '2026-06-01', 'https://ai.google.dev/pricing'),
  -- xAI
  ('grok-4',         'xai',       3.00/1e6, 3.00/1e6,  15.00/1e6, '2026-06-01', 'https://x.ai/api'),
  ('grok-4-fast',    'xai',       0.20/1e6, 0.20/1e6,   0.50/1e6, '2026-06-01', 'https://x.ai/api')
on conflict (model, effective_date) do nothing;
