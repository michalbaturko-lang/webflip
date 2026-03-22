import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateAnalysis } from "@/lib/supabase";
import { createServerClient } from "@/lib/supabase";
import type Stripe from "stripe";

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events.
 * Verifies signature, processes checkout.session.completed.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET env variable");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { token, variantIndex } = session.metadata || {};

    if (!token) {
      console.error("Webhook: missing token in session metadata");
      return NextResponse.json({ received: true });
    }

    try {
      // Update analysis record with payment info
      await updateAnalysis(token, {
        selected_variant: variantIndex ? Number(variantIndex) : null,
      });

      // Update CRM record with Stripe payment details
      const supabase = createServerClient();
      const { data: analysis } = await supabase
        .from("analyses")
        .select("url")
        .eq("token", token)
        .single();

      if (analysis?.url) {
        const domain = new URL(analysis.url).hostname.replace(/^www\./, "");

        // Update CRM record: set paid stage + payment info
        await supabase
          .from("crm_records")
          .update({
            stage: "paid",
            stripe_customer_id: session.customer as string | null,
            paid_amount: session.amount_total ? session.amount_total / 100 : null,
            paid_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("domain", domain);

        // Log payment activity
        const { data: crmRecord } = await supabase
          .from("crm_records")
          .select("id")
          .eq("domain", domain)
          .single();

        if (crmRecord) {
          await supabase.from("crm_activities").insert({
            crm_record_id: crmRecord.id,
            type: "payment_received",
            subject: "Payment received via Stripe Checkout",
            metadata: {
              stripe_session_id: session.id,
              amount: session.amount_total ? session.amount_total / 100 : null,
              currency: session.currency,
              variant_index: variantIndex ? Number(variantIndex) : null,
            },
          });
        }
      }
    } catch (err) {
      console.error("Webhook: failed to process payment:", err);
      return NextResponse.json(
        { error: "Failed to process payment" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
