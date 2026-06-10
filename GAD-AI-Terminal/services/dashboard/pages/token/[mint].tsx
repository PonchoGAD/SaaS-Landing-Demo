import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ScoreBadge from '../../components/ScoreBadge';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function TokenDetail() {
  const { query } = useRouter();
  const mint = query.mint as string;
  const [data, setData]       = useState<any>(null);
  const [report, setReport]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mint) return;
    Promise.all([
      fetch(`${API}/tokens/${mint}`).then(r => r.json()).catch(() => null),
      fetch(`${API}/terminal/analyze/${mint}`).then(r => r.json()).catch(() => null),
    ]).then(([t, r]) => {
      setData(t);
      setReport(r);
      setLoading(false);
    });
  }, [mint]);

  if (loading) return <p className="text-gray-500">Загрузка…</p>;
  if (!data?.token) return (
    <div>
      <Link href="/" className="text-purple-400 text-sm hover:underline">← Назад</Link>
      <p className="text-red-400 mt-4">Токен не найден: {mint}</p>
    </div>
  );

  const t = data.token;
  const s = data.scores?.[0] ?? {};
  const m = data.metrics?.[0] ?? {};

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/" className="text-purple-400 text-sm hover:underline">← Назад</Link>

      <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{t.symbol ?? '?'}</h2>
            <p className="text-gray-400 text-sm">{t.name}</p>
            <p className="font-mono text-xs text-gray-500 mt-1">{t.mint_address}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Market Cap</p>
            <p className="text-lg font-bold text-white">
              {t.market_cap ? `$${Number(t.market_cap).toLocaleString()}` : '—'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div><p className="text-xs text-gray-500">Holders</p><p className="text-white font-mono">{t.holder_count ?? '—'}</p></div>
          <div><p className="text-xs text-gray-500">Liquidity</p><p className="text-white font-mono">{t.liquidity ? `$${Number(t.liquidity).toLocaleString()}` : '—'}</p></div>
          <div><p className="text-xs text-gray-500">Age</p><p className="text-white font-mono">{t.token_age_hours ? `${t.token_age_hours}h` : '—'}</p></div>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'AI Score',  value: s.ai_score,       type: 'ai'   },
          { label: 'Risk',      value: s.risk_score,      type: 'risk' },
          { label: 'Growth',    value: s.growth_score,    type: 'ai'   },
          { label: 'Momentum',  value: s.momentum_score,  type: 'ai'   },
          { label: 'Liquidity', value: s.liquidity_score, type: 'ai'   },
          { label: 'Volume',    value: s.volume_score,    type: 'ai'   },
        ].map(item => (
          <div key={item.label} className="bg-[#18181f] border border-[#2a2a35] rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <ScoreBadge score={item.value} type={item.type as any} />
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Метрики</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div><p className="text-gray-500">Vol 5m</p><p className="text-white font-mono">${Number(m.volume_5m ?? 0).toFixed(0)}</p></div>
          <div><p className="text-gray-500">Vol 1h</p><p className="text-white font-mono">${Number(m.volume_1h ?? 0).toFixed(0)}</p></div>
          <div><p className="text-gray-500">Vol 24h</p><p className="text-white font-mono">${Number(m.volume_24h ?? 0).toFixed(0)}</p></div>
          <div><p className="text-gray-500">Liq Chg</p><p className={`font-mono ${Number(m.liquidity_change ?? 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>{Number(m.liquidity_change ?? 0).toFixed(1)}%</p></div>
          <div><p className="text-gray-500">Price 1h</p><p className={`font-mono ${Number(m.price_change_1h ?? 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>{Number(m.price_change_1h ?? 0).toFixed(2)}%</p></div>
          <div><p className="text-gray-500">Price 24h</p><p className={`font-mono ${Number(m.price_change_24h ?? 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>{Number(m.price_change_24h ?? 0).toFixed(2)}%</p></div>
        </div>
      </div>

      {/* AI Analysis */}
      {report && (
        <div className="bg-purple-600/5 border border-purple-500/20 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-purple-300">🤖 GAD AI Analysis</h3>
          <p className="text-sm text-gray-300">{report.summary}</p>
          <p className="text-sm font-bold text-white mt-1">{report.recommendation}</p>
        </div>
      )}

      {/* Alerts */}
      {data.alerts?.length > 0 && (
        <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Алерты</h3>
          <div className="space-y-2">
            {data.alerts.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-xs bg-gray-800/30 border border-gray-700 rounded px-3 py-2">
                <span className="font-semibold text-gray-300">{a.type}</span>
                <span className="text-gray-500">{new Date(a.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
