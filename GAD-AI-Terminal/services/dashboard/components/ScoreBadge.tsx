interface Props { score: number | null | undefined; type?: 'ai' | 'risk' | 'neutral'; size?: 'sm' | 'md' }

export default function ScoreBadge({ score, type = 'neutral', size = 'md' }: Props) {
  if (score === null || score === undefined) return <span className="text-gray-600">—</span>;

  const v = Number(score);
  let color = 'text-gray-400';
  if (type === 'ai') {
    if (v >= 80) color = 'text-green-400';
    else if (v >= 60) color = 'text-yellow-400';
    else if (v >= 40) color = 'text-orange-400';
    else color = 'text-red-400';
  } else if (type === 'risk') {
    if (v >= 70) color = 'text-red-400';
    else if (v >= 40) color = 'text-yellow-400';
    else color = 'text-green-400';
  }

  const sz = size === 'sm' ? 'text-xs font-mono' : 'text-sm font-mono font-semibold';
  return <span className={`${sz} ${color}`}>{v}</span>;
}
