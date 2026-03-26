#!/usr/bin/env npx tsx
/**
 * Seed script: Insert default outreach sequence "Webflipper Intro v1"
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-sequence.ts
 *
 * Creates a 3-step email sequence with Czech B2B web redesign templates:
 *   Step 1 (day 0) — cold_intro: first contact with suitability score
 *   Step 2 (day 3) — follow_up: reminder about redesign variants
 *   Step 3 (day 7) — final_push: last chance before expiration
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const SEQUENCE = {
  name: "Webflipper Intro v1",
  description:
    "3-step email sequence for B2B web redesign outreach (Czech). " +
    "Day 0: cold intro, Day 3: follow-up, Day 7: final push.",
  is_active: true,
  steps: [
    {
      step_number: 1,
      delay_days: 0,
      channel: "email",
      template: "cold_intro",
      subject: "Připravili jsme redesign pro {{company_name}}",
      conditions: {
        skip_if_paid: true,
        skip_if_visited: false,
        skip_if_replied: false,
      },
    },
    {
      step_number: 2,
      delay_days: 3,
      channel: "email",
      template: "follow_up",
      subject: "{{company_name}} — váš redesign stále čeká",
      conditions: {
        skip_if_paid: true,
        skip_if_visited: true,
        skip_if_replied: true,
      },
    },
    {
      step_number: 3,
      delay_days: 7,
      channel: "email",
      template: "final_push",
      subject: "Poslední šance: redesign {{company_name}} bude brzy odstraněn",
      conditions: {
        skip_if_paid: true,
        skip_if_visited: true,
        skip_if_replied: true,
      },
    },
  ],
};

async function main() {
  console.log("Checking for existing sequence...");

  // Check if sequence already exists
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/outreach_sequences?name=eq.${encodeURIComponent(SEQUENCE.name)}&select=id,name`,
    {
      headers: {
        apikey: SUPABASE_KEY!,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  if (!checkRes.ok) {
    console.error("Failed to check existing sequences:", await checkRes.text());
    process.exit(1);
  }

  const existing = await checkRes.json();
  if (existing.length > 0) {
    console.log(
      `Sequence "${SEQUENCE.name}" already exists (id: ${existing[0].id}). Skipping.`
    );
    process.exit(0);
  }

  // Insert new sequence
  console.log(`Creating sequence "${SEQUENCE.name}"...`);

  const insertRes = await fetch(
    `${SUPABASE_URL}/rest/v1/outreach_sequences`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY!,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(SEQUENCE),
    }
  );

  if (!insertRes.ok) {
    console.error("Failed to create sequence:", await insertRes.text());
    process.exit(1);
  }

  const created = await insertRes.json();
  const seq = Array.isArray(created) ? created[0] : created;

  console.log(`Created sequence "${seq.name}" with id: ${seq.id}`);
  console.log("Steps:");
  for (const step of SEQUENCE.steps) {
    console.log(
      `  Step ${step.step_number}: ${step.channel} — "${step.template}" (delay: ${step.delay_days}d)`
    );
  }

  console.log("\nMerge variables available in email templates:");
  console.log("  {{company_name}}  — Company name from CRM record");
  console.log("  {{domain}}        — Company domain");
  console.log("  {{contact_name}}  — Contact person name");
  console.log("  {{video_url}}     — Personalized video URL (if rendered)");
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
