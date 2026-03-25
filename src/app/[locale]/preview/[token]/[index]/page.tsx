export default async function PreviewPage({
  params,
}: {
  params: Promise<{ token: string; index: string }>;
}) {
  const { token, index } = await params;

  return (
    <div style={{ color: "white", padding: 40, background: "#0a0a1a", minHeight: "100vh" }}>
      <h1>Preview Route Works!</h1>
      <p>Token: {token}</p>
      <p>Index: {index}</p>
    </div>
  );
}
