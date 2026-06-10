import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Watchlist() {
  const [tokens, setTokens]   = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/watchlist`).then(r => r.json()).then(d => {
      setTokens(d.tokens ?? []);
      setWallets(d.wallets ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">📋 Watchlist</h2>
      {loading ? <p className="text-gray-500">Загрузка…</p> : (<>
        <section>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Токены ({tokens.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {tokens.map((t: any) => (
              <Link key={t.mint_address} href={`/token/${t.mint_address}`}
                className="flex items-center justify-between bg-[#18181f] border border-[#2a2a35] rounded-lg px-4 py-2 hover:border-purple-500/40 transition-colors">
                <span className="font-semibold text-white">{t.symbol ?? '?'}</span>
                <span className="font-mono text-xs text-gray-500">{t.mint_address.slice(0, 8)}…</span>
              </Link>
            ))}
            {!tokens.length && <p className="text-gray-500 text-sm col-span-2">Нет токенов в вотчлисте.</p>}
          </div>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Кошельки ({wallets.length})</h3>
          <div className="space-y-2">
            {wallets.map((w: any) => (
              <div key={w.id} className="bg-[#18181f] border border-[#2a2a35] rounded-lg px-4 py-2">
                <span className="font-mono text-sm text-gray-300">{w.address}</span>
              </div>
            ))}
            {!wallets.length && <p className="text-gray-500 text-sm">Нет кошельков в вотчлисте.</p>}
          </div>
        </section>
      </>)}
    </div>
  );
}
