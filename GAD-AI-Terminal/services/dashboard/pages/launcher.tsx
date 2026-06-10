import { useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Coin {
  mintAddress: string;
  name: string;
  ticker: string;
  status: string;
  solInvested: number;
  currentPriceSol: number | null;
  peakPriceSol: number | null;
  totalSoldSol: number;
  pnlSol: number;
  pnlPct: number | null;
  holderCount: number;
  launchedAt: string;
}

const statusColor = (s: string) =>
  s === 'LIVE'    ? 'bg-green-500/20 text-green-400 border-green-500/30' :
  s === 'SELLING' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
  s === 'SOLD'    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                    'bg-gray-500/20 text-gray-400 border-gray-500/30';

export default function Launcher() {
  const [coins, setCoins]       = useState<Coin[]>([]);
  const [loading, setLoading]   = useState(false);
  const [logs, setLogs]         = useState<string[]>([]);
  const [selling, setSelling]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', ticker: '', description: '',
    solBudget: '0.5', website: '', twitter: '', telegram: '',
  });

  const addLog = (msg: string) =>
    setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p.slice(0, 99)]);

  const loadCoins = async () => {
    try {
      const data = await fetch(`${API}/launcher/coins`).then(r => r.json());
      if (Array.isArray(data)) setCoins(data);
    } catch {}
  };

  useEffect(() => {
    loadCoins();
    const t = setInterval(loadCoins, 30_000);
    return () => clearInterval(t);
  }, []);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { addLog('❌ Выберите лого-файл'); return; }

    setLoading(true);
    addLog(`🚀 Деплоим ${form.name} (${form.ticker}) бюджет: ${form.solBudget} SOL...`);

    const fd = new FormData();
    fd.append('logo', file);
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));

    try {
      const res = await fetch(`${API}/launcher/create`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        addLog(`❌ Ошибка: ${data.error}`);
      } else {
        addLog(`✅ Запущен! Mint: ${data.mintAddress}`);
        addLog(`🔗 https://pump.fun/${data.mintAddress}`);
        setForm({ name: '', ticker: '', description: '', solBudget: '0.5', website: '', twitter: '', telegram: '' });
        if (fileRef.current) fileRef.current.value = '';
        await loadCoins();
      }
    } catch (err: any) {
      addLog(`❌ ${err.message}`);
    }
    setLoading(false);
  };

  const handleRefresh = async (mint: string, ticker: string) => {
    addLog(`🔄 Обновляю цену ${ticker}...`);
    try {
      const res = await fetch(`${API}/launcher/coins/${mint}/refresh`, { method: 'POST' });
      const d = await res.json();
      if (d.priceSol) addLog(`📊 ${ticker}: ${d.priceSol.toFixed(10)} SOL`);
      else addLog(`⚠️ ${ticker}: цена не найдена в DexScreener (токен ещё не появился)`);
      await loadCoins();
    } catch {}
  };

  const handleSell = async (mint: string, ticker: string, pct: number) => {
    if (!confirm(`Продать ${pct}% позиции по ${ticker}?`)) return;
    setSelling(mint);
    addLog(`💸 Продаю ${pct}% ${ticker}...`);
    try {
      const res = await fetch(`${API}/launcher/coins/${mint}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pct }),
      });
      const d = await res.json();
      if (!res.ok) addLog(`❌ Ошибка продажи: ${d.error}`);
      else addLog(`✅ ${ticker} продан → получено ${d.solReceived?.toFixed(4)} SOL`);
      await loadCoins();
    } catch (err: any) {
      addLog(`❌ ${err.message}`);
    }
    setSelling(null);
  };

  const f = (n: number | null, d = 4) => n != null ? n.toFixed(d) : '—';

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-bold text-white">🚀 Coin Launcher</h2>
      <p className="text-xs text-gray-500">Деплой собственного токена на pump.fun с отслеживанием P&L</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Launch form ─── */}
        <div className="lg:col-span-1">
          <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Запустить токен</h3>
            <form onSubmit={handleLaunch} className="space-y-3">
              {[
                { key: 'name',        label: 'Название',    ph: 'My Awesome Coin' },
                { key: 'ticker',      label: 'Тикер',       ph: 'MAC' },
                { key: 'solBudget',   label: 'Бюджет SOL',  ph: '0.5' },
                { key: 'website',     label: 'Сайт',        ph: 'https://...' },
                { key: 'twitter',     label: 'Twitter',     ph: '@handle' },
                { key: 'telegram',    label: 'Telegram',    ph: 't.me/...' },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <label className="text-xs text-gray-400">{label}</label>
                  <input
                    className="w-full mt-1 bg-[#12121a] border border-[#2a2a35] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                    placeholder={ph}
                    value={(form as any)[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    required={['name','ticker','solBudget'].includes(key)}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-400">Описание</label>
                <textarea
                  className="w-full mt-1 bg-[#12121a] border border-[#2a2a35] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none"
                  rows={3} placeholder="Описание проекта..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Лого (PNG/JPG)</label>
                <input ref={fileRef} type="file" accept="image/*" required
                  className="w-full mt-1 text-xs text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer" />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {loading ? '⏳ Деплоим...' : '🚀 Запустить'}
              </button>
              <p className="text-xs text-gray-600 text-center">40% бюджета = начальная ликвидность (твои деньги)</p>
            </form>
          </div>
        </div>

        {/* ─── Active coins ─── */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-white">Мои токены ({coins.length})</h3>
          {coins.length === 0 && (
            <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-8 text-center text-gray-500 text-sm">
              Нет запущенных токенов
            </div>
          )}
          {coins.map(c => {
            const isPnlPos = c.pnlSol >= 0;
            return (
              <div key={c.mintAddress} className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{c.name}</span>
                      <span className="text-xs text-gray-400 font-mono">${c.ticker}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                      {c.mintAddress.slice(0,12)}…
                      {' '}
                      <a href={`https://pump.fun/${c.mintAddress}`} target="_blank" rel="noreferrer"
                         className="text-purple-400 hover:text-purple-300">pump.fun ↗</a>
                      {' '}
                      <a href={`https://dexscreener.com/solana/${c.mintAddress}`} target="_blank" rel="noreferrer"
                         className="text-blue-400 hover:text-blue-300">dex ↗</a>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold font-mono ${isPnlPos ? 'text-green-400' : 'text-red-400'}`}>
                      {isPnlPos ? '+' : ''}{c.pnlSol.toFixed(4)} SOL
                    </div>
                    {c.pnlPct != null && (
                      <div className={`text-xs ${isPnlPos ? 'text-green-400' : 'text-red-400'}`}>
                        {isPnlPos ? '+' : ''}{c.pnlPct.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { label: 'Инвестировано', value: `${c.solInvested} SOL` },
                    { label: 'Продано',        value: `${f(c.totalSoldSol)} SOL` },
                    { label: 'Пик',            value: c.peakPriceSol ? `${f(c.peakPriceSol, 10)} SOL` : '—' },
                    { label: 'Холдеры',        value: c.holderCount.toString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#12121a] rounded p-2">
                      <div className="text-gray-500">{label}</div>
                      <div className="text-white font-mono mt-0.5 truncate">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  <button onClick={() => handleRefresh(c.mintAddress, c.ticker)}
                    className="text-xs px-3 py-1.5 rounded bg-[#2a2a35] hover:bg-[#35354a] text-gray-300 transition-colors">
                    🔄 Обновить цену
                  </button>
                  {c.status === 'LIVE' && (
                    <>
                      <button onClick={() => handleSell(c.mintAddress, c.ticker, 50)}
                        disabled={selling === c.mintAddress}
                        className="text-xs px-3 py-1.5 rounded bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-600/30 transition-colors disabled:opacity-50">
                        💸 Продать 50%
                      </button>
                      <button onClick={() => handleSell(c.mintAddress, c.ticker, 100)}
                        disabled={selling === c.mintAddress}
                        className="text-xs px-3 py-1.5 rounded bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 transition-colors disabled:opacity-50">
                        🚨 Emergency Exit (100%)
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Event log ─── */}
      <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">📋 Лог событий</h3>
        <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
          {logs.length === 0 && <p className="text-gray-600">Пусто</p>}
          {logs.map((l, i) => (
            <div key={i} className={`${l.includes('❌') ? 'text-red-400' : l.includes('✅') || l.includes('💸') ? 'text-green-400' : 'text-gray-400'}`}>
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
