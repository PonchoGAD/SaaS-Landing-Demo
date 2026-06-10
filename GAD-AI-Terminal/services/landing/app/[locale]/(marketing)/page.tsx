'use client';

import { useEffect, useState, useRef } from 'react';

const TG_BOT     = 'https://t.me/gadai_sol_bot';
const TG_CHANNEL = 'https://t.me/gadfamilytg';

const TERMINAL_LINES = [
  '> Scanning 14,293 tokens...',
  '> [WHALE] BONK: wallet 7xKp bought $420K 🐳',
  '> [ALERT] WIF: dev wallet moving — caution ⚠️',
  '> [SAFE] PEPE: risk score 94/100 ✅',
  '> [NEW GEM] $MOON — low cap, high volume 🚀',
  '> AI analysis: BULLISH signal detected',
  '> Rug probability: 3% — you might survive',
  '> Portfolio P&L today: +69% 📈',
  '> [WHALE] BONK: another degen aping in $200K',
];

const TICKER = [
  '🔥 BONK +420%', '💎 WIF +69%', '🌙 PEPE +1337%',
  '🚀 MOON +228%', '💀 RUGGED x0', '🐋 WHALE ALERT',
  '📊 AI SCAN LIVE', '⚡ SOLANA SPEED', '🎯 NGMI → WAGMI',
  '🔫 RUG DETECTED', '💰 BUY THE DIP', '🤖 BOT IS BASED',
];

const FEATURES = [
  { icon: '🌡️', title: 'MARKET REGIME ENGINE',   desc: 'Auto-detect BULL/BEAR/SIDEWAYS/EUPHORIA/PANIC. Trade with the regime, not against it.' },
  { icon: '🔄', title: 'MEME LIFECYCLE TRACKER', desc: 'BIRTH→ACCUMULATION→BREAKOUT→HYPE→DISTRIBUTION→DEATH. Know the stage, time the exit.' },
  { icon: '🎯', title: 'OPPORTUNITY ENGINE',      desc: 'Tokens BEFORE the move. Narrative + volume + whale accumulation = early alpha.' },
  { icon: '🧠', title: 'ALPHA MEMORY',            desc: 'Compares tokens to historical 50x/100x via cosine similarity. Pattern recognition on steroids.' },
  { icon: '👑', title: 'WALLET REPUTATION',       desc: 'LEGEND/SMART/AVERAGE/TOURIST/EXIT_LIQUIDITY classification. Know who you\'re trading with.' },
  { icon: '📡', title: 'SOCIAL KOL MONITOR',      desc: 'Realtime influencer tracking before the crowd arrives. First in, first out.' },
];

const STEPS = [
  {
    num: '01',
    title: 'OPEN THE BOT',
    desc: 'Open @gadai_sol_bot. Takes 10 seconds.',
  },
  {
    num: '02',
    title: 'LINK WALLET',
    desc: 'Use /link to connect your Solana wallet. Unlocks subscription and wallet reputation tracking.',
  },
  {
    num: '03',
    title: 'PAY & PROFIT',
    desc: 'Trial from 0.05 SOL. Get regime alerts, lifecycle stages, and KOL signals before the crowd.',
  },
];

const STATS = [
  { value: '14,293', label: 'Tokens Scanned' },
  { value: '$2.4B',  label: 'Volume Tracked' },
  { value: '847',    label: 'Rugs Avoided' },
  { value: '99.9%',  label: 'Uptime (we tried)' },
];

function seededRand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function MatrixBg() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="matrix-bg" aria-hidden>
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="matrix-col"
          style={{
            left: `${i * 5 + 2}%`,
            animationDuration: `${6 + (i % 7)}s`,
            animationDelay: `${(i * 0.7) % 5}s`,
          }}
        >
          {Array.from({ length: 30 }).map((_, j) => (
            <div key={j}>{seededRand(i * 30 + j) > 0.5 ? '1' : '0'}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [termLines, setTermLines] = useState([TERMINAL_LINES[0]]);
  const termRef = useRef<HTMLDivElement>(null);
  const idxRef  = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % TERMINAL_LINES.length;
      setTermLines(prev => [...prev, TERMINAL_LINES[idxRef.current]].slice(-8));
    }, 1200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [termLines]);

  const tickerDouble = [...TICKER, ...TICKER];

  return (
    <>
      <MatrixBg />

      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">GAD<span>AI</span> TERMINAL</div>
        <div className="nav-links">
          <a href="#features" className="nav-link">FEATURES</a>
          <a href="#how"      className="nav-link">HOW IT WORKS</a>
          <a href="#pricing"  className="nav-link">PRICING</a>
        </div>
        <a href={TG_BOT} target="_blank" rel="noopener noreferrer" className="nav-cta">
          ▶ OPEN BOT
        </a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-badge">⚡ LIVE ON SOLANA — DEGENS ONLY</div>
          <div className="pixel-bot">🤖</div>
          <h1 className="hero-title">
            THE <span className="accent">SOLANA</span><br />
            DEGEN <span className="accent2">TERMINAL</span>
          </h1>
          <p className="hero-sub">
            Scan meme coins. Track <strong>whale wallets</strong>. Get AI risk scores.<br />
            Detect rugs before they rekt you.<br />
            All in your Telegram. <strong>All for free to start.</strong>
          </p>
          <div className="hero-btns">
            <a href={TG_BOT}     target="_blank" rel="noopener noreferrer" className="btn-primary">
              🚀 OPEN @gadai_sol_bot
            </a>
            <a href={TG_CHANNEL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              📢 JOIN CHANNEL
            </a>
          </div>

          {/* TERMINAL DEMO */}
          <div className="terminal-wrap">
            <div className="terminal-bar">
              <div className="t-dot t-red" /><div className="t-dot t-yellow" /><div className="t-dot t-green" />
              <span style={{ marginLeft: 8 }}>gadai_sol_bot — live feed</span>
            </div>
            <div className="terminal" ref={termRef}>
              {termLines.map((line, i) => <div key={i} className="t-line">{line}</div>)}
              <div className="t-line"><span className="t-cursor" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {tickerDouble.map((item, i) => <span key={i} className="ticker-item">{item}</span>)}
        </div>
      </div>

      {/* FEATURES — Alpha Engine */}
      <section className="section" id="features" style={{ background: 'rgba(153,69,255,.03)' }}>
        <div className="container">
          <h2 className="section-title">ALPHA ENGINE</h2>
          <p className="section-sub">
            Six weapons that would have saved your bags last bull run. Not financial advice. Just algorithms and on-chain truth.
          </p>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <span className="feature-icon">{f.icon}</span>
                <div className="feature-title">{f.title}</div>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {STATS.map(s => (
              <div key={s.label} className="stat-box">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <div className="container">
          <h2 className="section-title">HOW IT WORKS</h2>
          <p className="section-sub">
            Three steps. Less effort than explaining to your parents what a meme coin is.
          </p>
          <div className="steps">
            {STEPS.map(s => (
              <div key={s.num} className="step">
                <div className="step-num">{s.num}</div>
                <div>
                  <div className="step-title">{s.title}</div>
                  <p className="step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section" id="pricing" style={{ background: 'rgba(153,69,255,.03)' }}>
        <div className="container">
          <h2 className="section-title">PRICING</h2>
          <p className="section-sub">Start free. Go pro when you&apos;re tired of missing 100x gems.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {/* FREE */}
            <div className="price-card">
              <div className="price-tier">FREE DEGEN</div>
              <div className="price-amount" style={{ fontSize: 28 }}>0 SOL</div>
              <p className="price-period">free forever</p>
              <ul className="price-features">
                <li><span className="check">✓</span> Basic token scanner</li>
                <li><span className="check">✓</span> 3 whale alerts/day</li>
                <li><span className="check">✓</span> AI risk scores</li>
                <li><span className="check">✓</span> Community alerts</li>
                <li style={{ opacity: .4 }}><span>✗</span> Real-time tracking</li>
                <li style={{ opacity: .4 }}><span>✗</span> KOL monitor</li>
              </ul>
              <a href={TG_BOT} target="_blank" rel="noopener noreferrer" className="price-btn secondary">
                START FREE
              </a>
            </div>

            {/* 1-DAY TRIAL */}
            <div className="price-card">
              <div className="price-tier">1-DAY TRIAL</div>
              <div className="price-amount" style={{ fontSize: 28 }}>0.05 SOL</div>
              <p className="price-period">24 hours</p>
              <ul className="price-features">
                <li><span className="check">✓</span> Full scanner access</li>
                <li><span className="check">✓</span> Whale alerts</li>
                <li><span className="check">✓</span> AI risk scores</li>
                <li><span className="check">✓</span> Regime detection</li>
                <li style={{ opacity: .4 }}><span>✗</span> KOL monitor</li>
                <li style={{ opacity: .4 }}><span>✗</span> Alpha memory</li>
              </ul>
              <a href="/pay?plan=trial_1d" className="price-btn secondary">
                TRY 24H
              </a>
            </div>

            {/* 3-DAY ACCESS */}
            <div className="price-card featured">
              <div className="price-badge">🔥 BEST VALUE</div>
              <div className="price-tier">3-DAY ACCESS</div>
              <div className="price-amount" style={{ fontSize: 28 }}>0.1 SOL</div>
              <p className="price-period">72 hours</p>
              <ul className="price-features">
                <li><span className="check">✓</span> Everything in Trial</li>
                <li><span className="check">✓</span> KOL monitor</li>
                <li><span className="check">✓</span> Lifecycle tracker</li>
                <li><span className="check">✓</span> Opportunity engine</li>
                <li><span className="check">✓</span> Alpha memory</li>
                <li><span className="check">✓</span> Wallet reputation</li>
              </ul>
              <a href="/pay?plan=trial_3d" className="price-btn">
                GET 3 DAYS 🚀
              </a>
            </div>

            {/* PRO CHAD */}
            <div className="price-card">
              <div className="price-tier">PRO CHAD</div>
              <div className="price-amount" style={{ fontSize: 28 }}>1.0 SOL</div>
              <p className="price-period">30 days</p>
              <ul className="price-features">
                <li><span className="check">✓</span> Everything</li>
                <li><span className="check">✓</span> Real-time scanner</li>
                <li><span className="check">✓</span> Smart money tracking</li>
                <li><span className="check">✓</span> Portfolio P&amp;L</li>
                <li><span className="check">✓</span> Priority alerts</li>
                <li><span className="check">✓</span> Custom thresholds</li>
              </ul>
              <a href="/pay?plan=monthly" className="price-btn secondary">
                GO PRO 💎
              </a>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'var(--muted)' }}>
            Payment via Solana (Phantom/Solflare). On-chain verified. Cancel anytime.
          </p>
        </div>
      </section>

      {/* NEW FEATURES — Sprint 14 */}
      <section className="section" style={{ background: 'rgba(0,180,120,.03)' }}>
        <div className="container">
          <h2 className="section-title">NEW IN JUNE 2026</h2>
          <p className="section-sub">Trade smarter. Launch honestly. Score tokens before you ape.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 40 }}>
            <a href="./trade-journal" style={{ textDecoration: 'none' }}>
              <div className="feature-card" style={{ cursor: 'pointer', borderColor: 'rgba(153,69,255,.3)' }}>
                <span className="feature-icon">📖</span>
                <div className="feature-title">TRADE JOURNAL</div>
                <p className="feature-desc">Auto trade documentation. P&L per trade, win rate, hold time, zero-exit analysis. /journal + /riskpassport.</p>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace', marginTop: 8, display: 'block' }}>→ Learn more</span>
              </div>
            </a>
            <a href="./token-score" style={{ textDecoration: 'none' }}>
              <div className="feature-card" style={{ cursor: 'pointer', borderColor: 'rgba(0,220,130,.3)' }}>
                <span className="feature-icon">🔍</span>
                <div className="feature-title">TOKEN SCORE</div>
                <p className="feature-desc">Transparency rating 0-100. Rug safety, liquidity health, holder count, metadata. /tokenscore before you buy.</p>
                <span style={{ fontSize: 11, color: '#00dc82', fontFamily: 'monospace', marginTop: 8, display: 'block' }}>→ Learn more</span>
              </div>
            </a>
            <a href="./launcher" style={{ textDecoration: 'none' }}>
              <div className="feature-card" style={{ cursor: 'pointer', borderColor: 'rgba(59,130,246,.3)' }}>
                <span className="feature-icon">🚀</span>
                <div className="feature-title">HONEST LAUNCHER</div>
                <p className="feature-desc">Deploy on Pump.fun in seconds. Fair launch only — no coordinated buys, no fake volume. /launch.</p>
                <span style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'monospace', marginTop: 8, display: 'block' }}>→ Learn more</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-section">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 64, marginBottom: 24, display: 'block', animation: 'float 3s ease-in-out infinite' }}>🚀</div>
          <h2 className="cta-title">
            STOP MISSING <span className="accent">100X GEMS</span><br />
            NGMI → WAGMI
          </h2>
          <p className="cta-sub">
            Join 1,000+ degens already using GAD AI Terminal to scan, track, and ape smarter on Solana.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={TG_BOT}     target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ fontSize: 13 }}>
              ⚡ OPEN BOT NOW — IT&apos;S FREE
            </a>
            <a href={TG_CHANNEL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              📢 JOIN CHANNEL
            </a>
          </div>
          <p className="cta-disclaimer">
            Not financial advice. Past performance ≠ future results. DYOR. We are all gonna make it (statistically unlikely but emotionally necessary).
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">GAD AI TERMINAL</div>
        <div className="footer-links">
          <a href={TG_BOT}         target="_blank" rel="noopener noreferrer" className="footer-link">Telegram Bot</a>
          <a href={TG_CHANNEL}     target="_blank" rel="noopener noreferrer" className="footer-link">Channel</a>
          <a href="#features"      className="footer-link">Features</a>
          <a href="#pricing"       className="footer-link">Pricing</a>
          <a href="./trade-journal" className="footer-link">Trade Journal</a>
          <a href="./token-score"  className="footer-link">Token Score</a>
          <a href="./launcher"     className="footer-link">Launcher</a>
        </div>
        <div className="footer-copy" suppressHydrationWarning>
          © {new Date().getFullYear()} GAD AI · WAGMI
        </div>
      </footer>
    </>
  );
}
