import { useEffect, useState } from 'react';
import ScoreBadge from '../components/ScoreBadge';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Whales() {
  const [whales, setWhales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch(`${API}/whales?limit=50`).then(r => r.json()).catch(() => ({ whales: [] }));
    setWhales(res.whales ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">🐋 Whale Tracker</h2>
      {loading ? <p className="text-gray-500">Загрузка…</p> : (
        <div className="overflow-x-auto rounded-lg border border-[#2a2a35]">
          <table className="w-full text-xs">
            <thead className="bg-[#18181f] text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Wallet</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right">Buys</th>
                <th className="px-4 py-3 text-right">Sells</th>
                <th className="px-4 py-3 text-right">Win%</th>
                <th className="px-4 py-3 text-right">ROI%</th>
                <th className="px-4 py-3 text-right">PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a35]">
              {whales.map((w: any, i: number) => (
                <tr key={w.address} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">
                    {w.label ? <span className="text-white mr-2">{w.label}</span> : null}
                    {w.address.slice(0, 8)}…{w.address.slice(-4)}
                  </td>
                  <td className="px-4 py-3 text-right"><ScoreBadge score={w.whale_score} type="ai" size="sm" /></td>
                  <td className="px-4 py-3 text-right text-green-400">{w.buy_count ?? 0}</td>
                  <td className="px-4 py-3 text-right text-red-400">{w.sell_count ?? 0}</td>
                  <td className="px-4 py-3 text-right">{Number(w.win_rate ?? 0).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right">{Number(w.roi ?? 0).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">${Number(w.pnl ?? 0).toFixed(0)}</td>
                </tr>
              ))}
              {!whales.length && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Нет данных по китам.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
