import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const COLORS: Record<string, string> = {
  HIGH_RISK:        'border-red-500/40 bg-red-500/10 text-red-300',
  NEW_HIGH_SCORE:   'border-green-500/40 bg-green-500/10 text-green-300',
  VOLUME_SPIKE:     'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  WHALE_ACTIVITY:   'border-blue-500/40 bg-blue-500/10 text-blue-300',
  LIQUIDITY_DROP:   'border-orange-500/40 bg-orange-500/10 text-orange-300',
  NEW_TOKEN:        'border-purple-500/40 bg-purple-500/10 text-purple-300',
  AI_SCORE_INCREASE:'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    const res = await fetch(`${API}/alerts?limit=100`).then(r => r.json()).catch(() => ({ alerts: [] }));
    setAlerts(res.alerts ?? []);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  const types = ['ALL', ...Array.from(new Set(alerts.map((a: any) => a.type)))];
  const filtered = filter === 'ALL' ? alerts : alerts.filter((a: any) => a.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">🚨 Alerts</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="bg-[#18181f] border border-[#2a2a35] text-white text-xs rounded px-2 py-1">
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        {filtered.map((a: any) => {
          const c = COLORS[a.type] ?? 'border-gray-700 bg-gray-800/20 text-gray-400';
          return (
            <div key={a.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm ${c}`}>
              <div>
                <span className="font-semibold mr-2">{a.type}</span>
                <span className="font-mono text-xs opacity-70">{(a.subject ?? '').slice(0, 20)}…</span>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs">score: {a.score ?? 0}</div>
                <div className="text-xs opacity-50">{new Date(a.created_at).toLocaleTimeString()}</div>
              </div>
            </div>
          );
        })}
        {!filtered.length && <p className="text-gray-500 text-sm">Нет алертов.</p>}
      </div>
    </div>
  );
}
