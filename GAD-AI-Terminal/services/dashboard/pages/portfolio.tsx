import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Portfolio() {
  const [data, setData] = useState<{ positions: any[]; stats: any }>({ positions: [], stats: {} });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch(`${API}/portfolio`).then(r => r.json()).catch(() => ({ positions: [], stats: {} }));
    setData(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const { positions, stats } = data;
  const statusColor = (s: string) => s === 'open' ? 'text-green-400' : 'text-gray-400';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">💼 Portfolio</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open',       value: stats.open ?? 0,    color: 'text-green-400' },
          { label: 'Closed',     value: stats.closed ?? 0,  color: 'text-gray-400' },
          { label: 'Win Rate',   value: `${stats.win_rate ?? 0}%`, color: (stats.win_rate ?? 0) >= 50 ? 'text-green-400' : 'text-red-400' },
          { label: 'Realized PnL', value: `$${Number(stats.realized_pnl ?? 0).toFixed(2)}`, color: Number(stats.realized_pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(c => (
          <div key={c.label} className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-4">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={`text-2xl font-bold font-mono ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      {loading ? <p className="text-gray-500">Загрузка…</p> : (
        <div className="overflow-x-auto rounded-lg border border-[#2a2a35]">
          <table className="w-full text-xs">
            <thead className="bg-[#18181f] text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-right">Entry</th>
                <th className="px-4 py-3 text-right">Current</th>
                <th className="px-4 py-3 text-right">Size</th>
                <th className="px-4 py-3 text-right">TP1</th>
                <th className="px-4 py-3 text-right">SL</th>
                <th className="px-4 py-3 text-right">ROI%</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a35]">
              {positions.map((p: any) => (
                <tr key={p.id} className="hover:bg-white/2">
                  <td className="px-4 py-3 font-semibold text-white">{p.symbol ?? '?'}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(p.entry_price).toFixed(6)}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.current_price ? Number(p.current_price).toFixed(6) : '—'}</td>
                  <td className="px-4 py-3 text-right">{p.position_size}</td>
                  <td className="px-4 py-3 text-right text-green-400">{p.take_profit_1 ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-red-400">{p.stop_loss ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {p.roi_pct != null ? <span className={Number(p.roi_pct) >= 0 ? 'text-green-400' : 'text-red-400'}>{p.roi_pct}%</span> : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right ${statusColor(p.status)}`}>{p.status}</td>
                </tr>
              ))}
              {!positions.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Нет позиций.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
