import { useEffect, useState } from 'react';
import ScoreBadge from '../components/ScoreBadge';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function SmartMoney() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch(`${API}/smart-money`).then(r => r.json()).catch(() => ({ smartWallets: [] }));
    setWallets(res.smartWallets ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">🧠 Smart Money</h2>
      <p className="text-xs text-gray-500">Кошельки с ROI {'>'} 50%, Win Rate {'>'} 55%, Trades {'>'} 30</p>
      {loading ? <p className="text-gray-500">Загрузка…</p> : (
        <div className="overflow-x-auto rounded-lg border border-[#2a2a35]">
          <table className="w-full text-xs">
            <thead className="bg-[#18181f] text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Wallet</th>
                <th className="px-4 py-3 text-right">SM Score</th>
                <th className="px-4 py-3 text-right">ROI%</th>
                <th className="px-4 py-3 text-right">Win%</th>
                <th className="px-4 py-3 text-right">Trades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a35]">
              {wallets.map((w: any, i: number) => (
                <tr key={w.address} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">{w.address.slice(0, 12)}…</td>
                  <td className="px-4 py-3 text-right"><ScoreBadge score={w.smart_money_score} type="ai" size="sm" /></td>
                  <td className="px-4 py-3 text-right text-green-400">{Number(w.roi ?? 0).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right">{Number(w.win_rate ?? 0).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right">{w.total_trades}</td>
                </tr>
              ))}
              {!wallets.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Нет smart money кошельков.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
