import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // Use Promise.race to prevent hangs if requestLocale never resolves
    let locale: string | undefined;
      try {
        locale = await Promise.race([
          requestLocale,
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2000)),
        ]);
      } catch {
        locale = undefined;
      }
  if (!locale || !routing.locales.includes(locale as never)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
