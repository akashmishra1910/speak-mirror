# Deployment Guide

This document describes how to deploy **SpeakMirror** to a production environment.

## 1. Hosting (Vercel)

SpeakMirror is optimized for Vercel out of the box.

### Steps to Deploy:
1. Push your code to your GitHub repository.
2. Link the repository to your Vercel project dashboard.
3. Configure the **Environment Variables** (see below).
4. Run the deploy step. Vercel automatically runs the Next.js build.

---

## 2. Environment Variables

Provide the following environment variables in the Vercel project settings:

| Variable Name | Description | Example / Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API connection URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client API key | Client-safe anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin bypass key (Keep secret!) | Server-only key |
| `GROQ_API_KEY` | Groq Llama 3 analysis token | Llama evaluation API key |
| `RESEND_API_KEY` | Email notifier service key | Resend SMTP API token |
| `CRON_SECRET` | Authenticate cron endpoints | Random hash string |

---

## 3. Supabase Setup & Database Migrations

Before launching, you must run the database migrations:

1. Install the Supabase CLI locally.
2. Link your local project to the remote Supabase database:
   ```bash
   supabase link --project-ref your-project-id
   ```
3. Apply migrations to the production database:
   ```bash
   supabase db push
   ```

---

## 4. Cron Jobs Configuration

The streaking reminder endpoints are scheduled daily. The schedules are defined inside `vercel.json` at the root of the project:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

This triggers the reminder API route daily at 9:00 AM UTC.
