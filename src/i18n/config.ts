export const locales = ["en", "de", "cs", "sk"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
