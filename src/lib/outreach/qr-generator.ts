import QRCode from "qrcode";

export interface QrCodeResult {
  svg: string;
  dataUrl: string;
}

/**
 * Generate a QR code locally using the qrcode npm package
 * @param url The URL to encode in the QR code
 * @returns Object containing both SVG string and data URL
 */
export async function generateQrCode(url: string): Promise<QrCodeResult> {
  try {
    // Generate SVG string
    const svg = await QRCode.toString(url, {
      type: "svg",
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Generate data URL
    const dataUrl = await QRCode.toDataURL(url, {
      type: "image/png",
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return { svg, dataUrl };
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}
