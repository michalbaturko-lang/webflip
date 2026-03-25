export default async function TestDynamicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  return (
    <div style={{ color: "white", padding: 40, background: "#0a0a1a", minHeight: "100vh" }}>
      <h1>Dynamic Test Works!</h1>
      <p>Locale: {locale}</p>
      <p>Slug: {slug}</p>
    </div>
  );
}
