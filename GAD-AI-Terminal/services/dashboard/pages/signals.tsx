import Link from 'next/link';

export default function Signals({ signals }: { signals: any[] }) {
  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif' }}>
      <h1>Signals</h1>
      <nav>
        <Link href="/">Overview</Link> | <Link href="/trending">Trending</Link> | <Link href="/watchlist">Watchlist</Link> | <Link href="/portfolio">Portfolio</Link> | <Link href="/risk">Risk</Link>
      </nav>
      <ul style={{ marginTop: '24px' }}>
        {signals.map((signal) => (
          <li key={signal.id}>{signal.type}: {signal.subject} ({signal.score})</li>
        ))}
      </ul>
    </div>
  );
}

export async function getServerSideProps() {
  const apiUrl = process.env.API_BASE_URL || 'http://localhost:4000';
  const response = await fetch(`${apiUrl}/signals`);
  const data = await response.json();
  return { props: { signals: data.signals || [] } };
}
