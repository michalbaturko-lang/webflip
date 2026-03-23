import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // Use Promise.race with an immediately-resolving fallback
  // to prevent SSR hangs in Vercel serverless runtime.
  // The layout.tsx handles correct locale loading via params.
  let locale: string | undefined;
  try {
    locale = await Promise.race([
      requestLocale,
      new Promise<string>((resolve) => resolve(routing.defaultLocale)),
    ]);
  } catch {
    locale = routing.defaultLocale;
  }

  if (!locale || !routing.locales.includes(locale as never)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
