# Outreach Pipeline Status

## What Works

### Sequence Engine (`src/lib/outreach/sequence-engine.ts`)
- Multi-step outreach sequences with configurable delays
- Email sending via Resend with rate limiting (10/min, 100/hr) and exponential retry
- LinkedIn task creation for manual operator follow-up
- Conditional step skipping (`skip_if_paid`, `skip_if_visited`, `skip_if_replied`)
- Automatic stage progression: `prospect → contacted → engaged`
- Bounce/unsubscribe guard — tagged contacts are automatically excluded

### Email Templates (`src/lib/outreach-email-templates.ts`)
- 3 email types: `cold_intro`, `follow_up`, `final_push`
- Table-based HTML layout (Outlook-compatible)
- Dark mode support via `@media (prefers-color-scheme: dark)`
- Czech language B2B web redesign content

### Webhook Tracking (`src/app/api/webhooks/resend/route.ts`)
- Resend webhook processing: `delivered`, `opened`, `clicked`, `bounced`, `complained`
- Svix signature verification
- Automatic CRM tagging: bounced contacts get `bounced` tag, complaints get `unsubscribed` + sequence removal

### Admin Dashboard (`src/app/[locale]/admin/outreach/page.tsx`)
- Daily stats (emails sent, LinkedIn tasks, visits)
- Pending email task queue with bulk send
- LinkedIn task management (complete/skip with optional message)
- Sequence overview with per-step enrollment counts

### Public Landing Page (`src/app/api/outreach/[slug]/route.ts`)
- Slug-based personalized landing pages
- Atomic visit counter (SQL RPC)
- Auto-engagement tracking: `contacted → engaged` on visit
- Full analysis data passthrough (scores, variants, findings)

### Video Integration (`src/lib/outreach/video-integration.ts`)
- Video template variable injection (`{{video_url}}`, `{{video_embed_html}}`, etc.)
- Pre-render capability for bulk outreach
- Clickable thumbnail fallback for email clients

### QR Code Tracking (`src/app/api/outreach/qr/[recordId]/route.ts`)
- Base62 short ID generation
- SVG QR code generation
- Scan tracking via CRM activities

## What Needs Manual Setup

### 1. Resend Email Service
- **Required env vars:** `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`
- **DNS setup:** Add SPF, DKIM, and DMARC records for `webflipper.app` domain
- **Webhook URL:** Configure in Resend dashboard → `https://webflip.cz/api/webhooks/resend`
- **Domain verification:** Verify sending domain in Resend dashboard

### 2. Hetzner Server (Video Rendering)
- Video rendering via Remotion requires a dedicated server (not Vercel)
- Setup Remotion Lambda or a Hetzner VPS with `@remotion/renderer`
- The render queue is managed via `video_renders` table
- Videos are stored in Supabase Storage or S3-compatible bucket

### 3. Supabase Configuration
- Run all migrations in `supabase/migrations/` (including `20260325_increment_visit_counter.sql`)
- Ensure RLS policies allow service role access to all outreach tables
- Create the `increment_landing_page_visits` SQL function

### 4. Vercel Cron
- Configure cron job in `vercel.json`:
  ```json
  {
    "crons": [{
      "path": "/api/cron/outreach",
      "schedule": "0 8 * * 1-5"
    }]
  }
  ```
- Set `CRON_SECRET` env var (Vercel auto-injects for cron requests)
- Max duration: 60s (Vercel free plan)

### 5. Admin API Key
- Set `ADMIN_API_KEY` env var for admin dashboard authentication

## Full Outreach Flow

```
1. Import leads
   └─ CSV upload → crm_records (with domain, company_name, contact_email)

2. Run analysis
   └─ Crawl website → AI extraction → generate 3 redesign variants
   └─ Link analysis_id to CRM record

3. Create sequence
   └─ POST /api/admin/sequences (or run scripts/seed-sequence.ts)
   └─ Define steps: channel (email/linkedin), delay_days, template, conditions

4. Enroll records
   └─ POST /api/admin/sequences/{id}/enroll
   └─ Sets outreach_sequence_step = 0 (not started)

5. Execute outreach (automatic or manual)
   ├─ Automatic: Vercel Cron → POST /api/cron/outreach
   │   └─ processOutreachSequences() processes all pending steps
   └─ Manual: Admin dashboard → select records → "Send"
       └─ POST /api/admin/outreach/execute

6. Email step execution
   └─ sendOutreachEmail() → Resend API
   └─ Log to outreach_email_logs (with resend_email_id)
   └─ Log to crm_activities
   └─ Advance outreach_sequence_step
   └─ Update stage: prospect → contacted

7. LinkedIn step execution
   └─ Create linkedin_tasks (status: pending)
   └─ Operator manually sends on LinkedIn
   └─ Mark complete via admin dashboard

8. Tracking & engagement
   ├─ Resend webhooks → outreach_email_logs status updates
   ├─ Landing page visit → increment visits, stage → engaged
   ├─ QR scan → crm_activities log
   └─ All events tracked in crm_activities for timeline

9. Conditions & guards
   ├─ skip_if_paid: don't contact paying customers
   ├─ skip_if_visited: skip if they already visited landing page
   ├─ skip_if_replied: (placeholder, needs activity query)
   ├─ bounced tag: auto-exclude from future emails
   └─ unsubscribed tag: auto-exclude + remove from sequence
```

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/seed-sequence.ts` | Create default "Webflipper Intro v1" sequence |
| `scripts/test-pipeline.ts` | Health check: DB, records, screenshots, sequences, renders |

Run with:
```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/<script>.ts
```
