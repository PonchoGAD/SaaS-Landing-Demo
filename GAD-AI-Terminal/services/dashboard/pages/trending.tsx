import { useEffect, useState } from 'react';
import TokenTable from '../components/TokenTable';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Trending() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch(`${API}/tokens/trending`).then(r => r.json()).catch(() => ({ tokens: [] }));
    setTokens(res.tokens ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">📈 Trending Tokens</h2>
        <span className="text-xs text-gray-500">Auto-refresh 30s</span>
      </div>
      {loading ? <p className="text-gray-500">Загрузка…</p> : <TokenTable tokens={tokens} showScores />}
    </div>
  );
}
