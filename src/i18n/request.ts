import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import type { Locale } from "./config";

export default getRequestConfig(async () => {
  // IMPORTANT: Both requestLocale and headers() hang indefinitely in
  // Vercel serverless. Use hardcoded default locale for getRequestConfig.
  // The layout's NextIntlClientProvider already delivers the correct
  // locale-specific messages to ALL client components via params.
  const locale: Locale = routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
