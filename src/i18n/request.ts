import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import type { Locale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  // Use requestLocale with a sync fallback — both requestLocale and headers()
  // can hang indefinitely in Vercel serverless, so we race with a short timeout.
  // The layout's NextIntlClientProvider already delivers correct messages to all
  // client components, so this fallback only affects pure server components.
  let locale: Locale = routing.defaultLocale;

  try {
    const resolved = await Promise.race([
      requestLocale,
      new Promise<string | undefined>((r) => setTimeout(() => r(undefined), 50)),
    ]);
    if (resolved && routing.locales.includes(resolved as Locale)) {
      locale = resolved as Locale;
    }
  } catch {
    // Fall back to default
  }

  return {
    locale,
    messages: (await import("../messages/" + locale + ".json")).default,
  };
});
