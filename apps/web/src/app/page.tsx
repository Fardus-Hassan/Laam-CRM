async function getApiHealth() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';
  try {
    const res = await fetch(`${apiUrl}/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const health = await getApiHealth();

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
      <h1>Laam CRM</h1>
      <p>Enterprise SaaS CRM monorepo — Next.js + NestJS + Nx</p>
      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>System Status</h2>
        <ul>
          <li>Web: <strong style={{ color: 'green' }}>running</strong></li>
          <li>
            API:{' '}
            {health ? (
              <strong style={{ color: 'green' }}>{health.service} v{health.version}</strong>
            ) : (
              <strong style={{ color: 'crimson' }}>offline — start with `pnpm dev:api`</strong>
            )}
          </li>
        </ul>
      </section>
    </main>
  );
}
