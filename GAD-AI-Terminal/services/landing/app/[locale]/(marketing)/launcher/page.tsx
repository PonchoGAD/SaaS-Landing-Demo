export const metadata = {
  title: 'Honest Token Launcher — GAD AI Terminal',
  description: 'Deploy your Solana token on Pump.fun with full transparency. Fair launch only — no coordinated buys, no fake volume.',
};

const TG_BOT   = 'https://t.me/gadai_sol_bot';
const DASHBOARD = 'https://gadai.shop/dashboard';

const STEPS = [
  {
    num: '01',
    title: 'Choose your token',
    desc: 'Pick a name, ticker ($MAX 8 chars), and upload a logo. Write a short description.',
  },
  {
    num: '02',
    title: 'Set your budget',
    desc: 'Choose how much SOL goes to initial liquidity on Pump.fun. Your budget = liquidity only.',
  },
  {
    num: '03',
    title: 'Launch',
    desc: 'Token deploys on Pump.fun in <30 seconds. Mint address returned immediately.',
  },
  {
    num: '04',
    title: 'Track & Exit',
    desc: 'Monitor price and P&L via /mycoins. Sell your position at market via /exitcoin.',
  },
];

const PRINCIPLES = [
  { icon: '✅', text: 'Your SOL goes ONLY to initial liquidity — no dev wallet' },
  { icon: '✅', text: 'No coordinated buys, no fake volume manipulation' },
  { icon: '✅', text: 'No satellite wallets, no pump-and-dump scheme' },
  { icon: '✅', text: 'Full transparency — all on-chain, verifiable' },
  { icon: '❌', text: 'No bot farms to inflate volume' },
  { icon: '❌', text: 'No insider wallets getting early allocation' },
];

export default function LauncherPage() {
  return (
    <main className="py-24 bg-[#0a0a0f] min-h-screen text-white">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 text-center">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-900/40 text-blue-300 border border-blue-700/40 mb-6">
          HONEST LAUNCHER
        </span>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          🚀 Deploy Your Token
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          Launch on Pump.fun in seconds. Fair and transparent — your budget goes to liquidity,
          not to hype machines. Build something real.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={DASHBOARD}
            className="inline-block px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold transition-colors"
          >
            Open Dashboard Launcher
          </a>
          <a
            href={TG_BOT}
            className="inline-block px-8 py-3 rounded-lg bg-[#18181f] border border-[#2a2a35] hover:border-blue-500/50 font-semibold transition-colors"
          >
            /launch in Telegram
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-6 mt-24">
        <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {STEPS.map((s) => (
            <div key={s.num} className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-6 flex gap-4">
              <span className="text-3xl font-bold font-mono text-blue-500">{s.num}</span>
              <div>
                <h3 className="font-bold text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fair launch principles */}
      <section className="mx-auto max-w-3xl px-6 mt-24">
        <h2 className="text-2xl font-bold text-center mb-10">Fair Launch Principles</h2>
        <div className="bg-[#18181f] border border-[#2a2a35] rounded-2xl p-8">
          <div className="grid sm:grid-cols-2 gap-3">
            {PRINCIPLES.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg">{p.icon}</span>
                <p className="text-sm text-gray-300">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-gray-600">
          GAD AI Terminal is committed to legal, transparent trading only.
          HonestLauncher exists to give real projects a fair start — not to create exit liquidity for insiders.
        </p>
      </section>

      {/* Telegram integration */}
      <section className="mx-auto max-w-3xl px-6 mt-24">
        <div className="bg-[#18181f] border border-blue-700/30 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 text-blue-300">Telegram Commands</h2>
          <pre className="text-sm font-mono text-blue-300 whitespace-pre-wrap leading-relaxed">{`/launch           — info + link to Dashboard launcher

/mycoins          — your deployed tokens with P&L
  🟢 MOON ($MOON) — +0.12 SOL (+240%)
     Status: LIVE | Invested: 0.05 SOL

/exitcoin MOON    — sell 100% at market
  ⚠️ Exit MOON ($MOON)?
  ✅ Sold! Received: 0.17 SOL`}</pre>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-6 mt-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to launch?</h2>
        <p className="text-gray-400 mb-8">Requires active GAD AI Terminal subscription.</p>
        <a
          href={DASHBOARD}
          className="inline-block px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold transition-colors"
        >
          Open Dashboard
        </a>
      </section>
    </main>
  );
}
