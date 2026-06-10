export const metadata = {
  title: 'TokenScore — GAD AI Terminal',
  description: 'Transparency and safety score for any Solana token. Check rug probability, liquidity health, holder distribution.',
};

const TG_BOT = 'https://t.me/gadai_sol_bot';

const COMPONENTS = [
  { label: 'Rug Safety',    max: 40, icon: '🛡', desc: 'Inverse of rug probability. Honeypot check, dev wallet concentration.' },
  { label: 'Liquidity',     max: 25, icon: '💧', desc: '$100k+ liquidity = max score. Thin liquidity = high slippage, easy manipulation.' },
  { label: 'Community',     max: 20, icon: '👥', desc: '1000+ holders = full score. Few holders = whale trap risk.' },
  { label: 'Transparency',  max: 15, icon: '📝', desc: 'Symbol, name, logo completeness + token age. Old tokens survive longer.' },
];

const LABELS = [
  { label: 'SAFE',      range: '85-100', color: 'text-green-400',  bg: 'bg-green-900/30 border-green-700/40' },
  { label: 'MODERATE',  range: '70-84',  color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-700/40' },
  { label: 'RISKY',     range: '50-69',  color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-700/40' },
  { label: 'DANGEROUS', range: '0-49',   color: 'text-red-400',    bg: 'bg-red-900/30 border-red-700/40' },
];

export default function TokenScorePage() {
  return (
    <main className="py-24 bg-[#0a0a0f] min-h-screen text-white">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 text-center">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold bg-green-900/40 text-green-300 border border-green-700/40 mb-6">
          TRANSPARENCY TOOL
        </span>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          🔍 TokenScore
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          Before you ape in — check the score. Rug probability, liquidity health, holder distribution,
          and metadata completeness in one number.
        </p>
        <a
          href={TG_BOT}
          className="inline-block px-8 py-3 rounded-lg bg-green-700 hover:bg-green-600 font-semibold transition-colors font-mono"
        >
          /tokenscore {'<mint>'}
        </a>
      </section>

      {/* Score Components */}
      <section className="mx-auto max-w-4xl px-6 mt-20">
        <h2 className="text-2xl font-bold text-center mb-12">Score breakdown (0-100)</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {COMPONENTS.map((c) => (
            <div key={c.label} className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-6 flex gap-4">
              <span className="text-3xl">{c.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">{c.label}</h3>
                  <span className="text-xs text-gray-500 font-mono">0-{c.max} pts</span>
                </div>
                <p className="mt-1 text-sm text-gray-400">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Labels */}
      <section className="mx-auto max-w-4xl px-6 mt-20">
        <h2 className="text-2xl font-bold text-center mb-10">Score labels</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LABELS.map((l) => (
            <div key={l.label} className={`${l.bg} border rounded-xl p-5 text-center`}>
              <p className={`text-xl font-bold font-mono ${l.color}`}>{l.label}</p>
              <p className="text-xs text-gray-500 mt-1">{l.range}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example output */}
      <section className="mx-auto max-w-3xl px-6 mt-24">
        <div className="bg-[#18181f] border border-green-700/30 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 text-green-300">Example output</h2>
          <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap leading-relaxed">{`🟢 TokenScore — BONK

Score: 87/100 — SAFE

🛡 Rug Safety:   35/40
💧 Liquidity:    25/25
👥 Community:    20/20
📝 Transparency: 7/15

Rug prob: 3% | Holders: 142,830 | Age: 180d | Liq: $2.4M

---

🔴 TokenScore — NEWRUG

Score: 28/100 — DANGEROUS

🛡 Rug Safety:   5/40
💧 Liquidity:    3/25
👥 Community:    2/20
📝 Transparency: 3/15

⚠️ Flags:
• High rug probability: 87%
• Very low liquidity
• Too few holders (<50)
• Very new token (<24h)`}</pre>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-6 mt-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Check before you buy</h2>
        <p className="text-gray-400 mb-8">
          Available via Telegram bot with any active subscription.
        </p>
        <a
          href={TG_BOT}
          className="inline-block px-8 py-3 rounded-lg bg-green-700 hover:bg-green-600 font-semibold transition-colors"
        >
          Open @gadai_sol_bot
        </a>
      </section>
    </main>
  );
}
