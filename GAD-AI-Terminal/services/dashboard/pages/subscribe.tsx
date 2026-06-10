import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Solana Phantom wallet interface ─────────────────────────────────────────
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      isSolflare?: boolean;
      connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
      disconnect(): Promise<void>;
      signAndSendTransaction(tx: any): Promise<{ signature: string }>;
      publicKey?: { toString(): string };
    };
    solflare?: {
      connect(): Promise<void>;
      disconnect(): Promise<void>;
      publicKey?: { toString(): string };
      signAndSendTransaction(tx: any): Promise<{ signature: string }>;
    };
  }
}

interface Plan {
  slug: string;
  name: string;
  price_sol: number;
  duration_hours: number;
  features: string[];
}

interface SubStatus {
  active: boolean;
  plan?: string;
  expiresAt?: string;
  remainingHours?: number;
  isTrial?: boolean;
  trialAvailable?: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  trending:               '📈 Trending tokens',
  highscore:              '🏆 High AI Score alerts',
  highrisk:               '⚠️ High Risk alerts',
  alerts:                 '🚨 Real-time alerts',
  token_analysis:         '🔍 Full token analysis',
  rug_check:              '🛡 Rug probability check',
  basic_whale:            '🐋 Basic whale tracking',
  all_features:           '✅ All features included',
  narrative:              '📖 Narrative Engine',
  social:                 '📊 Social & Hype Score',
  wallet_dna:             '🧬 Wallet DNA profiling',
  survival:               '⏱ Survival Score model',
  copy_intelligence:      '🔎 Copy Intelligence',
  smart_money:            '🧠 Smart Money signals',
  early_conviction:       '⚡ Early Conviction Engine',
  unlimited_autobuy:      '🤖 Unlimited Auto-buy',
  portfolio_management:   '💼 Portfolio management',
};

export default function Subscribe() {
  const router = useRouter();
  const [plans, setPlans]           = useState<Plan[]>([]);
  const [treasury, setTreasury]     = useState<string>('');
  const [wallet, setWallet]         = useState<string>('');
  const [status, setStatus]         = useState<SubStatus | null>(null);
  const [loading, setLoading]       = useState(false);
  const [txStatus, setTxStatus]     = useState('');
  const [error, setError]           = useState('');
  const [connecting, setConnecting] = useState(false);

  // ─── Load plans ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/subscription/plans`).then(r => r.json()).then(d => {
      setPlans(d.plans ?? []);
      setTreasury(d.treasury ?? '');
    });
  }, []);

  // ─── Load subscription status ────────────────────────────────────────────
  const refreshStatus = useCallback(async (addr: string) => {
    const res = await fetch(`${API}/subscription/status?wallet=${addr}`).then(r => r.json());
    setStatus(res);
  }, []);

  useEffect(() => {
    if (wallet) refreshStatus(wallet);
  }, [wallet, refreshStatus]);

  // ─── Reconnect if already connected ──────────────────────────────────────
  useEffect(() => {
    const phantom = window.solana;
    if (phantom?.publicKey) {
      const addr = phantom.publicKey.toString();
      setWallet(addr);
      refreshStatus(addr);
    }
  }, [refreshStatus]);

  // ─── Wallet connect ───────────────────────────────────────────────────────
  const connectPhantom = async () => {
    setConnecting(true);
    setError('');
    try {
      const phantom = window.solana;
      if (!phantom || !phantom.isPhantom) {
        throw new Error('Phantom wallet not found. Install it from phantom.app');
      }
      const resp = await phantom.connect();
      const addr = resp.publicKey.toString();
      setWallet(addr);
      await refreshStatus(addr);
    } catch (e: any) {
      setError(e.message ?? 'Wallet connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const connectSolflare = async () => {
    setConnecting(true);
    setError('');
    try {
      const sf = window.solflare;
      if (!sf) throw new Error('Solflare not found. Install from solflare.com');
      await sf.connect();
      const addr = sf.publicKey?.toString();
      if (!addr) throw new Error('Could not get public key from Solflare');
      setWallet(addr);
      await refreshStatus(addr);
    } catch (e: any) {
      setError(e.message ?? 'Solflare connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    await window.solana?.disconnect().catch(() => {});
    setWallet('');
    setStatus(null);
  };

  // ─── Build + send SOL payment transaction ────────────────────────────────
  const subscribe = async (plan: Plan) => {
    if (!wallet) return setError('Connect your wallet first');
    if (!treasury) return setError('Treasury wallet not configured on server');
    setLoading(true);
    setError('');
    setTxStatus('Building transaction…');

    try {
      // Dynamically import to avoid SSR issues
      const web3 = await import('@solana/web3.js');
      const connection = new web3.Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
        'confirmed'
      );

      const fromPubkey  = new web3.PublicKey(wallet);
      const toPubkey    = new web3.PublicKey(treasury);
      const lamports    = Math.round(plan.price_sol * web3.LAMPORTS_PER_SOL);

      const { blockhash } = await connection.getLatestBlockhash();
      const tx = new web3.Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPubkey
      }).add(
        web3.SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
      );

      setTxStatus('Please approve in wallet…');
      const phantom = window.solana;
      if (!phantom) throw new Error('Wallet not connected');

      const { signature } = await phantom.signAndSendTransaction(tx);
      setTxStatus(`Tx sent: ${signature.slice(0, 12)}… Confirming…`);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      setTxStatus('Payment confirmed. Activating subscription…');

      // Verify on backend
      const resp = await fetch(`${API}/subscription/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: wallet,
          tx_signature: signature,
          plan_slug: plan.slug
        })
      }).then(r => r.json());

      if (resp.error) throw new Error(resp.error);

      setTxStatus('✅ Subscription activated!');
      await refreshStatus(wallet);
      setTimeout(() => router.push('/'), 2000);
    } catch (e: any) {
      setError(e.message ?? 'Payment failed');
      setTxStatus('');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const isTrial = (plan: Plan) => plan.slug === 'trial_1d';
  const trialDisabled = status?.trialAvailable === false && !status?.active;

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-white">GAD AI Terminal</h1>
        <p className="text-gray-400">Полный доступ к аналитике Solana мемтокенов</p>
        <a href="https://t.me/gadai_sol_bot" target="_blank" rel="noreferrer"
          className="inline-block text-purple-400 text-sm hover:underline">t.me/gadai_sol_bot</a>
      </div>

      {/* Active subscription banner */}
      {status?.active && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <p className="text-green-300 font-semibold">✅ Подписка активна</p>
          <p className="text-green-400/70 text-sm mt-1">
            {status.isTrial ? '🕐 Trial' : '💎 Full Access'} — истекает через {' '}
            <strong>{status.remainingHours?.toFixed(1)} часов</strong>
            {' '}({new Date(status.expiresAt!).toLocaleString()})
          </p>
          {status.isTrial && (
            <p className="text-yellow-400 text-xs mt-2">Хотите продолжить? Перейдите на месячный план ↓</p>
          )}
        </div>
      )}

      {/* Wallet section */}
      <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Подключите кошелёк Solana</h3>
        {wallet ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Подключён</p>
              <p className="font-mono text-sm text-white">{wallet.slice(0, 16)}…{wallet.slice(-8)}</p>
            </div>
            <button onClick={disconnect}
              className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg">
              Отключить
            </button>
          </div>
        ) : (
          <div className="flex gap-3 flex-wrap">
            <button onClick={connectPhantom} disabled={connecting}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
              👻 Phantom
            </button>
            <button onClick={connectSolflare} disabled={connecting}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
              ☀️ Solflare
            </button>
            <div className="flex items-center text-xs text-gray-500">
              {connecting ? 'Подключение…' : 'Выберите кошелёк'}
            </div>
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const trial = isTrial(plan);
          const disabled = loading || !wallet || (trial && trialDisabled);
          const alreadyOnThisPlan = status?.active && status.plan === plan.slug;

          return (
            <div key={plan.slug}
              className={`relative rounded-xl border p-6 space-y-4 transition-all ${
                trial
                  ? 'border-[#2a2a35] bg-[#18181f]'
                  : 'border-purple-500/40 bg-purple-900/10'
              }`}>
              {!trial && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  ПОПУЛЯРНЫЙ
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-white">{plan.price_sol}</span>
                  <span className="text-gray-400 text-sm">SOL</span>
                  <span className="text-gray-500 text-xs ml-1">
                    / {plan.duration_hours >= 720 ? 'месяц' : `${plan.duration_hours} час`}
                  </span>
                </div>
              </div>

              <ul className="space-y-1.5">
                {(plan.features as string[]).map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">✓</span>
                    {FEATURE_LABELS[f] ?? f}
                  </li>
                ))}
              </ul>

              {alreadyOnThisPlan ? (
                <div className="w-full py-2.5 rounded-lg text-center text-green-400 text-sm font-semibold bg-green-500/10 border border-green-500/20">
                  ✅ Активна
                </div>
              ) : (
                <button
                  onClick={() => subscribe(plan)}
                  disabled={disabled}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    disabled
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : trial
                        ? 'bg-white/10 hover:bg-white/15 text-white'
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {trial && trialDisabled
                    ? '⛔ Триал уже использован'
                    : !wallet
                      ? '🔌 Подключите кошелёк'
                      : `Оплатить ${plan.price_sol} SOL`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* TX Status */}
      {txStatus && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-blue-300 text-sm text-center">
          {txStatus}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm text-center">
          ❌ {error}
        </div>
      )}

      {/* Treasury info */}
      {treasury && (
        <div className="text-center text-xs text-gray-600">
          <p>Treasury: <span className="font-mono">{treasury}</span></p>
        </div>
      )}

      {/* How it works */}
      <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Как это работает?</h3>
        <ol className="space-y-2 text-sm text-gray-400">
          <li className="flex gap-2"><span className="text-purple-400 font-bold">1.</span> Подключите Phantom или Solflare кошелёк</li>
          <li className="flex gap-2"><span className="text-purple-400 font-bold">2.</span> Выберите план — 0.1 SOL (1 день тест) или 1 SOL (1 месяц)</li>
          <li className="flex gap-2"><span className="text-purple-400 font-bold">3.</span> Подтвердите транзакцию в кошельке</li>
          <li className="flex gap-2"><span className="text-purple-400 font-bold">4.</span> Подписка активируется автоматически после подтверждения on-chain</li>
          <li className="flex gap-2"><span className="text-purple-400 font-bold">5.</span> После тестового дня вам предложат перейти на месячный план</li>
        </ol>
      </div>
    </div>
  );
}
