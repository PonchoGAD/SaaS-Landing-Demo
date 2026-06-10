import Link from 'next/link';

export default function Risk({ signals }: { signals: any[] }) {
  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif' }}>
      <h1>Risk</h1>
      <nav>
        <Link href="/">Overview</Link> | <Link href="/trending">Trending</Link> | <Link href="/watchlist">Watchlist</Link> | <Link href="/portfolio">Portfolio</Link> | <Link href="/signals">Signals</Link>
      </nav>
      <div style={{ marginTop: '24px' }}>
        <h2>Risk alerts</h2>
        <ul>
          {signals.map((signal) => (
            <li key={signal.id}>{signal.subject} — score {signal.score}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const apiUrl = process.env.API_BASE_URL || 'http://localhost:4000';
  const response = await fetch(`${apiUrl}/signals`);
  const data = await response.json();
  return { props: { signals: data.signals || [] } };
}
