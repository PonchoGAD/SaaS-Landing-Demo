export const metadata = {
  title: 'Trade Journal — GAD AI Terminal',
  description: 'Automatic trade documentation, weekly P&L reports, and CSV export for every Solana memecoin trade.',
};

const TG_BOT = 'https://t.me/gadai_sol_bot';

const STATS = [
  { value: '/journal',       label: 'Telegram command' },
  { value: '/riskpassport',  label: 'Risk profile command' },
  { value: 'CSV',            label: 'Export format' },
  { value: 'Auto',           label: 'Fully automated' },
];

const FEATURES = [
  {
    icon: '📖',
    title: 'Every Trade Logged',
    desc: 'Entry price, exit price, hold time, sell reason — every auto-trade documented automatically.',
  },
  {
    icon: '📊',
    title: 'P&L Breakdown',
    desc: 'See ROI per trade, total P&L, win rate, and zero-exits (unsellable tokens) clearly separated.',
  },
  {
    icon: '🧠',
    title: 'Risk Passport',
    desc: 'Your personal trading profile: DISCIPLINED / LEARNING / HIGH_RISK based on actual trade history.',
  },
  {
    icon: '📥',
    title: 'CSV Export',
    desc: 'Download full history as CSV. Import into Excel, Google Sheets, or any analytics tool.',
  },
  {
    icon: '🎯',
    title: 'Tier Breakdown',
    desc: 'Win rate by liquidity tier: T1 Micro ($20-80k), T2 Small ($80-250k), T3 Mid ($250-500k).',
  },
  {
    icon: '💡',
    title: 'AI Advice',
    desc: 'System spots patterns in your losses and gives concrete advice: entry filters, stop-loss tuning.',
  },
];

export default function TradeJournalPage() {
  return (
    <main className="py-24 bg-[#0a0a0f] min-h-screen text-white">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 text-center">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold bg-purple-900/40 text-purple-300 border border-purple-700/40 mb-6">
          SPRINT 14 — NEW FEATURE
        </span>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          📖 Trade Journal
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          Every trade documented automatically. Know your win rate, where you lose money, and why.
          Stop guessing — start improving.
        </p>
        <a
          href={TG_BOT}
          className="inline-block px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold transition-colors"
        >
          Open Bot — /journal
        </a>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-4xl px-6 mt-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-5 text-center">
              <p className="text-2xl font-bold font-mono text-purple-400">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 mt-24">
        <h2 className="text-2xl font-bold text-center mb-12">What Trade Journal tracks</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-6">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-3 font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Risk Passport Preview */}
      <section className="mx-auto max-w-3xl px-6 mt-24">
        <div className="bg-[#18181f] border border-purple-700/30 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 text-purple-300">📊 Risk Passport Example</h2>
          <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap leading-relaxed">{`📊 Risk Passport

🏆 Profile: DISCIPLINED | Risk Score: 72/100

Trades: 23 | WR: 43%
PnL: +0.12 SOL (ROI: +14%)
Avg Hold: 18min | RR: 1.4

By Tier:
  T1 Micro: 8 trades, WR: 37%
  T2 Small: 12 trades, WR: 50%
  T3 Mid:   3 trades, WR: 33%

Advice:
• Win rate improving in T2 — increase T2 position size.
• 2 zero-exits — avoid pump.fun tokens (unsellable).`}</pre>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-6 mt-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Analyze your trading history</h2>
        <p className="text-gray-400 mb-8">Use /journal and /riskpassport in the bot — free with subscription.</p>
        <a
          href={TG_BOT}
          className="inline-block px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold transition-colors mr-4"
        >
          Open @gadai_sol_bot
        </a>
      </section>
    </main>
  );
}
