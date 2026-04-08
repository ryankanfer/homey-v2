# weekly-digest Edge Function

Sends a personalized weekly email digest to every buyer/renter with a complete profile.

## Deploy

```bash
supabase functions deploy weekly-digest --no-verify-jwt
```

`--no-verify-jwt` allows the Supabase cron scheduler to invoke it without a user token.

## Environment variables

Set these in Supabase Dashboard → Project Settings → Edge Functions → Secrets:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | Your Resend API key (resend.com) |
| `DIGEST_FROM_EMAIL` | `homey. <brief@homeypocket.ai>` |
| `NEXT_PUBLIC_APP_URL` | `https://homeypocket.ai` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase.

## Schedule (weekly, Monday 9am ET)

In Supabase Dashboard → Database → Cron Jobs → Create job:

- **Name:** `weekly-buyer-digest`
- **Schedule:** `0 14 * * 1` (14:00 UTC = 9:00 ET, every Monday)
- **Command:**
  ```sql
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/weekly-digest',
    headers := '{"Authorization": "Bearer <anon-key>"}'::jsonb,
    body := '{}'::jsonb
  );
  ```
  Replace `<project-ref>` with your Supabase project ref and `<anon-key>` with your anon public key.

## Test (dry run — no emails sent)

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/weekly-digest \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

## Email design

- Background: `#0D0D0B` (matches app dark theme)
- Accent: `#C8B89A` (sand/gold — brand color)
- Serif headers in Georgia (web-safe, renders in all email clients)
- Monospaced readiness bar (`█░` — reliable across clients)
- Max-width: 560px
- No images — pure HTML/text for deliverability
