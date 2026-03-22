import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";
import { getAnalysis } from "@/lib/supabase";
import type { CrmRecord } from "@/types/admin";

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session for purchasing a redesign variant.
 * Supports two modes:
 * 1. Token-based: { token: string, variantIndex: number, locale?: string }
 * 2. Domain-based: { domain: string, recordId: string, locale?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, variantIndex, domain, recordId, locale } = body;

    let analysis;
    let crmRecord: CrmRecord | null = null;
    let successUrl: string;
    let cancelUrl: string;
    const origin = new URL(request.url).origin;
    const localePrefix = locale || "en";

    // Handle domain-based checkout (from preview/[domain])
    if (domain) {
      if (!domain || typeof domain !== "string") {
        return NextResponse.json({ error: "Domain is required" }, { status: 400 });
      }

      const supabase = createServerClient();
      const { data: record } = await supabase
        .from("crm_records")
        .select("*")
        .eq("domain", domain)
        .single();

      if (!record) {
        return NextResponse.json(
          { error: "Record not found" },
          { status: 404 }
        );
      }

      crmRecord = record as CrmRecord;
      const analysisToken = (crmRecord as any).metadata?.analysis_token || crmRecord.analysis_id;

      if (analysisToken) {
        analysis = await getAnalysis(analysisToken);
      }

      successUrl = `${origin}/${localePrefix}/success/${analysisToken || crmRecord.id}?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${origin}/${localePrefix}/preview/${domain}`;
    } else {
      // Handle token-based checkout (from preview/[token]/[index])
      if (!token || typeof token !== "string") {
        return NextResponse.json({ error: "Token is required" }, { status: 400 });
      }

      if (typeof variantIndex !== "number" || variantIndex < 0) {
        return NextResponse.json(
          { error: "Invalid variantIndex" },
          { status: 400 }
        );
      }

      analysis = await getAnalysis(token);
      if (!analysis) {
        return NextResponse.json(
          { error: "Analysis not found" },
          { status: 404 }
        );
      }

      const variantsCount = (analysis.variants || []).length;
      if (variantIndex >= variantsCount) {
        return NextResponse.json(
          { error: `Invalid variantIndex: ${variantIndex}` },
          { status: 400 }
        );
      }

      successUrl = `${origin}/${localePrefix}/success/${token}?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${origin}/${localePrefix}/preview/${token}/${variantIndex}`;
    }

    // Validate analysis
    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    if (analysis.status !== "complete") {
      return NextResponse.json(
        { error: "Analysis not yet complete" },
        { status: 400 }
      );
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      console.error("Missing STRIPE_PRICE_ID env variable");
      return NextResponse.json(
        { error: "Payment configuration error" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        token: token || analysis.token,
        variantIndex: variantIndex !== undefined ? String(variantIndex) : "0",
        analysisUrl: analysis.url,
        domain: domain || undefined,
        recordId: crmRecord?.id || recordId || undefined,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("POST /api/checkout error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
