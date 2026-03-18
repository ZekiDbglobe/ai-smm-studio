-- Enable the required extensions once from the Supabase dashboard if they are not active yet.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists vault;

-- Replace the values below with your deployed service base URL and trigger secret.
select vault.create_secret('https://your-service.example.com', 'instagram_renderer_base_url');
select vault.create_secret('your-shared-trigger-secret', 'instagram_renderer_trigger_secret');

select cron.schedule(
    'instagram-daily-post',
    '0 10 * * *',
    $$
    select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'instagram_renderer_base_url')
            || '/api/internal/cron-trigger-post-to-instagram',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-trigger-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'instagram_renderer_trigger_secret')
        ),
        body := jsonb_build_object(
            'triggeredAt', timezone('utc', now())
        ),
        timeout_milliseconds := 10000
    ) as request_id;
    $$
);
