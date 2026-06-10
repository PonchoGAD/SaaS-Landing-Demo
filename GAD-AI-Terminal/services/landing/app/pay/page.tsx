'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

// All API calls go through the Next.js proxy → avoids CORS/localhost issues
const API_URL    = '/api/proxy';
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const TREASURY_ENV = process.env.NEXT_PUBLIC_TREASURY_WALLET || '';

const TG_BOT     = 'https://t.me/gadai_sol_bot';
const TG_CHANNEL = 'https://t.me/gadfamilytg';

interface Plan {
  slug: string;
  name: string;
  price_sol: number;
  duration_hours: number;
  features: string[];
}

type Step = 'idle' | 'connecting' | 'sending' | 'confirming' | 'verifying' | 'linking' | 'done' | 'error';

function getProvider(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).phantom?.solana
      ?? (window as any).solana
      ?? (window as any).solflare
      ?? null;
}

function planIcon(slug: string) {
  if (slug === 'trial_1d') return '🧪';
  if (slug === 'trial_3d') return '⚡';
  return '💎';
}

function planDuration(hours: number) {
  if (hours < 48) return `${hours} hours`;
  return `${Math.round(hours / 24)} days`;
}

const FALLBACK_PLANS: Plan[] = [
  {
    slug: 'trial_1d',
    name: '1-Day Trial',
    price_sol: 0.05,
    duration_hours: 24,
    features: ['Basic scanner', 'Whale alerts', 'AI risk scores', 'GAD Score 0–100'],
  },
  {
    slug: 'trial_3d',
    name: '3-Day Access',
    price_sol: 0.1,
    duration_hours: 72,
    features: ['Everything in 1-day', 'Market Regime Engine', 'Lifecycle Tracker', 'Opportunity Engine'],
  },
  {
    slug: 'monthly',
    name: 'Full Access — 30 Days',
    price_sol: 1.0,
    duration_hours: 720,
    features: ['All Alpha Engine features', 'Auto-buy via Jupiter DEX', 'Portfolio P&L', 'Smart money signals', 'Priority alerts', 'Wallet Reputation DNA'],
  },
];

export default function PayPage() {
  const [plans, setPlans]         = useState<Plan[]>([]);
  const [treasury, setTreasury]   = useState('');
  const [selected, setSelected]   = useState<Plan | null>(null);
  const [wallet, setWallet]       = useState('');
  const [step, setStep]           = useState<Step>('idle');
  const [txSig, setTxSig]         = useState('');
  const [error, setError]         = useState('');
  const [mounted, setMounted]     = useState(false);
  const [tgId, setTgId]           = useState('');

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    setTgId(params.get('tg_id') ?? '');

    const planParam = params.get('plan');
    fetch(`${API_URL}/subscription/plans`)
      .then(r => r.json())
      .then(d => {
        const loadedPlans: Plan[] = d.plans ?? FALLBACK_PLANS;
        setPlans(loadedPlans);
        setTreasury(d.treasury || TREASURY_ENV);
        const preselect = planParam ? loadedPlans.find(p => p.slug === planParam) : null;
        setSelected(preselect ?? loadedPlans[0] ?? null);
      })
      .catch(() => {
        setPlans(FALLBACK_PLANS);
        setTreasury(TREASURY_ENV);
        const preselect = planParam ? FALLBACK_PLANS.find(p => p.slug === planParam) : null;
        setSelected(preselect ?? FALLBACK_PLANS[0]);
      });
  }, []);

  const connectWallet = useCallback(async () => {
    setError('');
    const provider = getProvider();
    if (!provider) {
      setError('Phantom or Solflare wallet not detected. Please install the extension.');
      return;
    }
    setStep('connecting');
    try {
      const resp = await provider.connect();
      setWallet(resp.publicKey.toString());
      setStep('idle');
    } catch (e: any) {
      setError(e?.message ?? 'Wallet connection cancelled.');
      setStep('idle');
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    getProvider()?.disconnect?.().catch(() => {});
    setWallet('');
    setStep('idle');
    setTxSig('');
    setError('');
  }, []);

  const pay = useCallback(async () => {
    if (!wallet || !selected || !treasury) return;
    setError('');

    try {
      setStep('sending');
      const provider   = getProvider();
      const connection = new Connection(SOLANA_RPC, 'confirmed');
      const lamports   = Math.round(selected.price_sol * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(wallet),
          toPubkey:   new PublicKey(treasury),
          lamports,
        })
      );
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer        = new PublicKey(wallet);

      const signed    = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      setTxSig(signature);

      setStep('confirming');
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

      setStep('verifying');
      const verifyRes = await fetch(`${API_URL}/subscription/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: wallet, tx_signature: signature, plan_slug: selected.slug }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error ?? 'Verification failed');

      if (tgId) {
        setStep('linking');
        await fetch(`${API_URL}/tg/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_id: tgId, wallet_address: wallet }),
        }).catch(() => {});

        await fetch(`${API_URL}/tg/notify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_id: tgId, plan_slug: selected.slug, expires_at: verifyData.subscription?.expires_at }),
        }).catch(() => {});
      }

      setStep('done');
    } catch (e: any) {
      setError(e?.message ?? 'Payment failed. Please try again.');
      setStep('error');
    }
  }, [wallet, selected, treasury, tgId]);

  if (!mounted) return null;

  const stepLabels: Record<Step, string> = {
    idle:       '',
    connecting: 'Connecting wallet…',
    sending:    'Sending transaction…',
    confirming: 'Confirming on-chain…',
    verifying:  'Verifying payment…',
    linking:    'Activating subscription…',
    done:       'Payment confirmed!',
    error:      'Error',
  };
  const isProcessing = ['connecting','sending','confirming','verifying','linking'].includes(step);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050508; color: #e0e0f0; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; }
        .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 16px; }
        .card { background: #0d0d18; border: 2px solid #1e1e30; padding: 40px 32px; max-width: 640px; width: 100%; }
        .logo { font-family: 'Press Start 2P', monospace; font-size: 11px; color: #14F195; margin-bottom: 8px; letter-spacing: 2px; }
        .logo span { color: #9945FF; }
        .title { font-family: 'Press Start 2P', monospace; font-size: 16px; color: #fff; margin-bottom: 8px; }
        .subtitle { font-size: 14px; color: #555570; margin-bottom: 32px; line-height: 1.6; }
        .plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
        .plan { padding: 20px 14px; border: 2px solid #1e1e30; cursor: pointer; transition: all .15s; text-align: center; position: relative; }
        .plan:hover { border-color: #9945FF55; }
        .plan.selected { border-color: #14F195; background: #14F19508; }
        .plan.popular::before { content: '🔥 POPULAR'; position: absolute; top: -1px; left: 50%; transform: translateX(-50%); background: #9945FF; color: #fff; font-size: 8px; font-family: 'Press Start 2P', monospace; padding: 3px 8px; white-space: nowrap; }
        .plan-icon { font-size: 24px; margin-bottom: 8px; }
        .plan-name { font-family: 'Press Start 2P', monospace; font-size: 7px; color: #888; margin-bottom: 6px; letter-spacing: 1px; }
        .plan-price { font-family: 'Press Start 2P', monospace; font-size: 16px; color: #14F195; margin-bottom: 4px; }
        .plan-dur { font-size: 11px; color: #555570; margin-bottom: 12px; }
        .plan-feats { list-style: none; text-align: left; }
        .plan-feats li { font-size: 11px; color: #555570; padding: 3px 0; display: flex; gap: 6px; }
        .plan-feats li::before { content: '✓'; color: #14F195; flex-shrink: 0; }
        .section-label { font-size: 11px; color: #555570; margin-bottom: 10px; letter-spacing: 1px; text-transform: uppercase; }
        .wallet-box { border: 2px solid #1e1e30; padding: 14px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .wallet-addr { font-family: monospace; font-size: 12px; color: #14F195; word-break: break-all; }
        .wallet-hint { font-size: 12px; color: #555570; }
        .btn { font-family: 'Press Start 2P', monospace; font-size: 10px; padding: 14px 20px; cursor: pointer; border: none; transition: all .15s; display: inline-block; text-align: center; }
        .btn-primary { background: #9945FF; color: #fff; border: 2px solid #14F195; width: 100%; }
        .btn-primary:hover:not(:disabled) { background: #14F195; color: #050508; }
        .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
        .btn-outline { background: transparent; color: #9945FF; border: 2px solid #9945FF; }
        .btn-outline:hover { background: #9945FF15; }
        .btn-ghost { background: transparent; color: #555570; border: 2px solid #1e1e30; font-size: 9px; padding: 8px 12px; }
        .btn-ghost:hover { border-color: #555570; color: #888; }
        .status-bar { padding: 12px 16px; border: 2px solid #1e1e30; margin-bottom: 20px; font-size: 13px; }
        .status-bar.processing { border-color: #9945FF55; color: #9945FF; }
        .status-bar.done { border-color: #14F195; color: #14F195; }
        .status-bar.error { border-color: #FF444455; color: #FF4444; }
        .tx-link { font-family: monospace; font-size: 11px; color: #555570; word-break: break-all; margin-top: 8px; }
        .tx-link a { color: #14F195; text-decoration: none; }
        .success-box { text-align: center; padding: 32px 0; }
        .success-icon { font-size: 64px; margin-bottom: 16px; }
        .success-title { font-family: 'Press Start 2P', monospace; font-size: 14px; color: #14F195; margin-bottom: 12px; }
        .success-sub { font-size: 14px; color: #555570; line-height: 1.7; margin-bottom: 24px; }
        .tg-btn { display: inline-block; padding: 14px 24px; background: #2AABEE; color: #fff; text-decoration: none; font-family: 'Press Start 2P', monospace; font-size: 10px; border: none; cursor: pointer; margin: 0 6px 8px; }
        .tg-btn:hover { background: #1e96d4; }
        .notice { font-size: 11px; color: #555570; line-height: 1.6; margin-top: 20px; padding-top: 20px; border-top: 1px solid #1e1e30; }
        .notice a { color: #9945FF; text-decoration: none; }
        .spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; margin-right: 8px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 580px) { .plan-grid { grid-template-columns: 1fr; } .card { padding: 28px 16px; } }
      `}</style>

      <div className="page">
        <div className="card">
          <div className="logo">GAD<span>AI</span> TERMINAL</div>
          <h1 className="title">Get Access</h1>
          <p className="subtitle">
            Pay with SOL on-chain to unlock the full Solana degen terminal.
            No accounts, no KYC — just your wallet.
            {tgId && <> Telegram ID: <code style={{ color: '#9945FF' }}>{tgId}</code></>}
          </p>

          {step === 'done' ? (
            <div className="success-box">
              <div className="success-icon">🚀</div>
              <div className="success-title">SUBSCRIPTION ACTIVE</div>
              <p className="success-sub">
                {tgId
                  ? 'Your bot access has been activated! Return to Telegram and send /status to confirm.'
                  : 'Subscription activated. Use /wallet in the bot to link this wallet, then /status to confirm.'}
              </p>
              <div>
                <a href={TG_BOT} className="tg-btn">▶ Open @gadai_sol_bot</a>
                <a href={TG_CHANNEL} className="tg-btn" style={{ background: '#229ED9' }}>📢 Join Channel</a>
              </div>
              {txSig && (
                <p className="tx-link" style={{ marginTop: 20 }}>
                  Tx: <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer">
                    {txSig.slice(0, 24)}…
                  </a>
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="section-label">Choose Plan</p>
              <div className="plan-grid">
                {(plans.length ? plans : FALLBACK_PLANS).map(p => (
                  <div
                    key={p.slug}
                    className={`plan${selected?.slug === p.slug ? ' selected' : ''}${p.slug === 'trial_3d' ? ' popular' : ''}`}
                    onClick={() => !isProcessing && setSelected(p)}
                    style={p.slug === 'trial_3d' ? { marginTop: 14 } : {}}
                  >
                    <div className="plan-icon">{planIcon(p.slug)}</div>
                    <div className="plan-name">{p.name}</div>
                    <div className="plan-price">{p.price_sol} SOL</div>
                    <div className="plan-dur">{planDuration(p.duration_hours)}</div>
                    <ul className="plan-feats">
                      {(p.features ?? []).slice(0, 4).map(f => (
                        <li key={f}>{f.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <p className="section-label">Solana Wallet</p>
              {wallet ? (
                <div className="wallet-box">
                  <span className="wallet-addr">{wallet.slice(0, 20)}…{wallet.slice(-6)}</span>
                  <button className="btn btn-ghost" onClick={disconnectWallet}>Disconnect</button>
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <p className="wallet-hint" style={{ marginBottom: 12 }}>
                    Connect Phantom or Solflare to pay.
                  </p>
                  <button
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                    onClick={connectWallet}
                    disabled={isProcessing}
                  >
                    Connect Wallet
                  </button>
                </div>
              )}

              {(isProcessing || step === 'error') && (
                <div className={`status-bar ${step === 'error' ? 'error' : 'processing'}`}>
                  {isProcessing && <span className="spinner" />}
                  {stepLabels[step]}
                  {txSig && step !== 'error' && (
                    <p className="tx-link">
                      Tx: <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer">
                        {txSig.slice(0, 20)}…
                      </a>
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="status-bar error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={pay}
                disabled={!wallet || !selected || isProcessing || !treasury}
              >
                {isProcessing
                  ? <><span className="spinner" />{stepLabels[step]}</>
                  : selected
                    ? `Pay ${selected.price_sol} SOL — ${selected.name}`
                    : 'Select a plan'}
              </button>

              {!treasury && (
                <p style={{ fontSize: 11, color: '#FF4444', marginTop: 12 }}>
                  Treasury wallet not configured. Contact support.
                </p>
              )}

              <p className="notice">
                Funds go directly to the treasury wallet on Solana mainnet.
                On-chain verification — no middleman, no trust required.{' '}
                Questions? <a href={TG_CHANNEL} rel="noopener noreferrer">Join our channel</a> or{' '}
                <a href={TG_BOT} rel="noopener noreferrer">open the bot</a>.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
