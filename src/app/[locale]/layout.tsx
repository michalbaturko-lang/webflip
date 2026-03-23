import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import ThemeProvider from "@/components/ThemeProvider";
import "../globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  try {
    // Add 2-second timeout for metadata generation
    const messages = await withTimeout(
      import(`@/messages/${locale}.json`).then((m) => m.default),
      2000
    );

    if (messages) {
      return {
        title: messages.meta.title,
        description: messages.meta.description,
      };
    }
  } catch (error) {
    // If message loading fails, use default metadata
  }

  // Return default metadata when loading fails or times out
  return {
    title: "Webflipper",
    description: "Webflipper Admin",
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Helper to add timeout to promise
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]).catch((error) => {
    console.warn(`Operation timeout or error: ${error.message}`);
    return null;
  });
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  let messages = null;
  try {
    // Add 5-second timeout for message loading to prevent hanging on Vercel cold starts
    messages = await withTimeout(getMessages(), 5000);
  } catch (error) {
    // If message loading fails (e.g., missing message files), continue without i18n
    // This prevents SSR timeouts on Vercel cold starts
    console.warn("Failed to load i18n messages, continuing without translation support", error);
    messages = null;
  }

  // Only wrap with NextIntlClientProvider if messages loaded successfully
  const hasMessages = messages !== null && Object.keys(messages).length > 0;

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        {hasMessages && messages ? (
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </NextIntlClientProvider>
        ) : (
          <ThemeProvider>
            {children}
          </ThemeProvider>
        )}
      </body>
    </html>
  );
}
