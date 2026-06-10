import { useState } from 'react';
import ScoreBadge from '../components/ScoreBadge';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Terminal() {
  const [mint, setMint]     = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const analyze = async () => {
    if (!mint.trim()) return;
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await fetch(`${API}/terminal/analyze/${mint.trim()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      setReport(await res.json());
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (lvl: string) =>
    lvl === 'HIGH' ? 'text-red-400 bg-red-500/10' :
    lvl === 'MEDIUM' ? 'text-yellow-400 bg-yellow-500/10' : 'text-green-400 bg-green-500/10';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">🤖 GAD AI Terminal</h2>
        <p className="text-xs text-gray-500">Введите адрес токена для полного анализа</p>
      </div>

      <div className="flex gap-2">
        <input
          value={mint}
          onChange={e => setMint(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && analyze()}
          placeholder="Token mint address…"
          className="flex-1 bg-[#18181f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2 font-mono
                     focus:outline-none focus:border-purple-500 placeholder:text-gray-600"
        />
        <button onClick={analyze} disabled={loading}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {loading ? '…' : 'Analyze'}
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}

      {report && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold text-white">{report.token?.symbol ?? '?'}</h3>
                <p className="font-mono text-xs text-gray-500">{report.token?.mint_address}</p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${riskColor(report.riskLevel)}`}>
                {report.riskLevel} RISK
              </span>
            </div>
            <p className="text-sm text-gray-300 mt-3">{report.summary}</p>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'AI Score',  value: report.aiScore,            type: 'ai' },
              { label: 'Risk',      value: report.riskScore,          type: 'risk' },
              { label: 'Growth',    value: report.scores?.growth,     type: 'ai' },
              { label: 'Momentum',  value: report.scores?.momentum,   type: 'ai' },
              { label: 'Liquidity', value: report.scores?.liquidity,  type: 'ai' },
              { label: 'Volume',    value: report.scores?.volume,     type: 'ai' },
            ].map(s => (
              <div key={s.label} className="bg-[#18181f] border border-[#2a2a35] rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <ScoreBadge score={s.value} type={s.type as any} />
              </div>
            ))}
          </div>

          {/* Bull / Bear */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-green-400 mb-2">🟢 Bull Case</h4>
              <ul className="space-y-1">
                {report.bullCase?.map((p: string, i: number) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2"><span>•</span>{p}</li>
                ))}
              </ul>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-red-400 mb-2">🔴 Bear Case</h4>
              <ul className="space-y-1">
                {report.bearCase?.map((p: string, i: number) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2"><span>•</span>{p}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-4">
            <p className="text-sm font-semibold text-purple-300">🎯 Рекомендация</p>
            <p className="text-white font-bold mt-1">{report.recommendation}</p>
          </div>

          {/* Alerts */}
          {report.activeAlerts?.length > 0 && (
            <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 mb-2">Активные алерты</p>
              <div className="flex flex-wrap gap-2">
                {report.activeAlerts.map((a: any, i: number) => (
                  <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                    {a.type} ({a.score})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Telegram link */}
      <div className="text-center pt-4 border-t border-[#2a2a35]">
        <p className="text-xs text-gray-500">Полный доступ через Telegram:</p>
        <a href="https://t.me/gadai_sol_bot" target="_blank" rel="noreferrer"
          className="text-purple-400 hover:text-purple-300 text-sm font-semibold">
          t.me/gadai_sol_bot
        </a>
      </div>
    </div>
  );
}
