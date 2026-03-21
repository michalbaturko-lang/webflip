import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { CrmRecord } from "@/types/admin";

const supabase = () => createServerClient();

// Generate a simple base62 short ID (6 characters)
function generateShortId(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a simple QR code SVG using a third-party QR service
 * For production, consider using the 'qrcode' npm package or a service like QR Code API
 */
function generateQrSvg(text: string): string {
  // Use a simple data URL approach with a QR code generation service
  // For now, return a placeholder that encodes the text
  // In production, you'd use a library like 'qrcode' or an external API

  // Create a simple SVG-based approach using encoded data
  const encoded = encodeURIComponent(text);
  // Return a data URL that points to an online QR service
  // For actual implementation, use: npm install qrcode
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const { recordId } = await params;
    const db = supabase();

    // Fetch the record to get the slug
    const { data: record, error: recordError } = await db
      .from("crm_records")
      .select("id, domain, company_name, outreach_slug")
      .eq("id", recordId)
      .single();

    if (recordError || !record) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    const crmRecord = record as CrmRecord & { outreach_slug?: string };

    // Use existing outreach_slug or generate new short ID
    let shortId = crmRecord.outreach_slug;
    if (!shortId) {
      shortId = generateShortId();
      // Store the short ID in metadata
      const { error: updateError } = await db
        .from("crm_records")
        .update({ outreach_slug: shortId })
        .eq("id", recordId);

      if (updateError) {
        console.error("Error storing short ID:", updateError);
      }
    }

    // Get the app URL from environment or construct it
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const trackingUrl = `${appUrl}/r/${shortId}`;

    // Generate QR code
    const qrImageUrl = generateQrSvg(trackingUrl);

    // Create activity log for QR code generation
    await db.from("crm_activities").insert({
      crm_record_id: recordId,
      type: "qr_scanned", // Mark as generated (will be changed to scanned when actually scanned)
      subject: "QR Code Generated",
      metadata: {
        short_id: shortId,
        tracking_url: trackingUrl,
        qr_image_url: qrImageUrl,
      },
    });

    return NextResponse.json({
      qr_image_url: qrImageUrl,
      tracking_url: trackingUrl,
      short_id: shortId,
    });
  } catch (err) {
    console.error("GET /api/outreach/qr/[recordId] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
