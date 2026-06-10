import Link from 'next/link';
import ScoreBadge from './ScoreBadge';

interface Token {
  mint_address: string;
  symbol?: string;
  name?: string;
  market_cap?: number;
  holder_count?: number;
  ai_score?: number;
  risk_score?: number;
  liquidity?: number;
}

interface Props {
  tokens: Token[];
  showScores?: boolean;
}

export default function TokenTable({ tokens, showScores = true }: Props) {
  if (!tokens.length) return <p className="text-gray-500 text-sm">Нет данных.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-[#2a2a35]">
      <table className="w-full text-sm">
        <thead className="bg-[#18181f] text-gray-500 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 text-left">#</th>
            <th className="px-4 py-3 text-left">Symbol</th>
            <th className="px-4 py-3 text-left">Mint</th>
            <th className="px-4 py-3 text-right">Market Cap</th>
            {showScores && <>
              <th className="px-4 py-3 text-right">AI Score</th>
              <th className="px-4 py-3 text-right">Risk</th>
            </>}
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2a2a35]">
          {tokens.map((t, i) => (
            <tr key={t.mint_address} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{i + 1}</td>
              <td className="px-4 py-3 font-semibold text-white">{t.symbol ?? '?'}</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-400">
                {t.mint_address.slice(0, 8)}…{t.mint_address.slice(-4)}
              </td>
              <td className="px-4 py-3 text-right text-gray-300">
                {t.market_cap ? `$${Number(t.market_cap).toLocaleString()}` : '—'}
              </td>
              {showScores && <>
                <td className="px-4 py-3 text-right"><ScoreBadge score={t.ai_score} type="ai" /></td>
                <td className="px-4 py-3 text-right"><ScoreBadge score={t.risk_score} type="risk" /></td>
              </>}
              <td className="px-4 py-3 text-right">
                <Link href={`/token/${t.mint_address}`}
                  className="text-xs text-purple-400 hover:text-purple-300 hover:underline">
                  Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
