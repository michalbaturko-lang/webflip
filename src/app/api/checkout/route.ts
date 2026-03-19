import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAnalysis } from "@/lib/supabase";

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session for purchasing a redesign variant.
 * Body: { token: string, variantIndex: number, locale?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, variantIndex, locale } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (typeof variantIndex !== "number" || variantIndex < 0) {
      return NextResponse.json(
        { error: "Invalid variantIndex" },
        { status: 400 }
      );
    }

    const analysis = await getAnalysis(token);
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

    const variantsCount = (analysis.variants || []).length;
    if (variantIndex >= variantsCount) {
      return NextResponse.json(
        { error: `Invalid variantIndex: ${variantIndex}` },
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

    const origin = new URL(request.url).origin;
    const localePrefix = locale || "en";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        token,
        variantIndex: String(variantIndex),
        analysisUrl: analysis.url,
      },
      success_url: `${origin}/${localePrefix}/success/${token}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${localePrefix}/preview/${token}/${variantIndex}`,
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
