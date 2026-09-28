-- Padrão de modelos da IA: roteador gratuito da OpenRouter (spec 005 AC-10).
alter table public.ai_settings
  alter column models set default '{"prompt":"openrouter/free","prd":"openrouter/free","chat":"openrouter/free"}'::jsonb;

-- Só troca quem ainda está no padrão pago antigo; escolha feita no admin fica.
update public.ai_settings
set models = '{"prompt":"openrouter/free","prd":"openrouter/free","chat":"openrouter/free"}'::jsonb
where models = '{"prompt":"openai/gpt-4o-mini","prd":"openai/gpt-4o-mini","chat":"openai/gpt-4o-mini"}'::jsonb;
