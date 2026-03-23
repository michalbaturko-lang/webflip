import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { routing } from "./routing";

export default getRequestConfig(async () => {
  // Do NOT use requestLocale - it hangs indefinitely in Vercel serverless.
  // Instead, extract locale from the x-next-intl-locale header set by middleware,
  // or fall back to parsing the URL path.
  let locale = routing.defaultLocale;

  try {
    const headersList = await headers();
    const intlLocale = headersList.get("x-next-intl-locale");
    if (intlLocale && routing.locales.includes(intlLocale as never)) {
      locale = intlLocale;
    } else {
      // Fallback: parse locale from URL path
      const nextUrl = headersList.get("x-invoke-path") || headersList.get("x-matched-path") || "";
      const match = nextUrl.match(/^\/([a-z]{2})(\/|$)/);
      if (match && routing.locales.includes(match[1] as never)) {
        locale = match[1];
      }
    }
  } catch {
    // headers() may fail in some contexts, use default
  }

  return {
    locale,
    messages: (await import("../messages/" + locale + ".json")).default,
  };
});
