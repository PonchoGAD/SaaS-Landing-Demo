import { useEffect, useState } from 'react';
import TokenTable from '../components/TokenTable';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function HighScore() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [threshold, setThreshold] = useState(80);
  const [loading, setLoading] = useState(true);

  const load = async (t = threshold) => {
    const res = await fetch(`${API}/tokens/highscore?threshold=${t}`).then(r => r.json()).catch(() => ({ tokens: [] }));
    setTokens(res.tokens ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(() => load(), 30_000);
    return () => clearInterval(id);
  }, [threshold]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">🏆 High AI Score</h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Threshold:</label>
          <select value={threshold} onChange={e => setThreshold(Number(e.target.value))}
            className="bg-[#18181f] border border-[#2a2a35] text-white text-xs rounded px-2 py-1">
            {[60, 70, 75, 80, 85, 90].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>
      {loading ? <p className="text-gray-500">Загрузка…</p> : <TokenTable tokens={tokens} showScores />}
    </div>
  );
}
