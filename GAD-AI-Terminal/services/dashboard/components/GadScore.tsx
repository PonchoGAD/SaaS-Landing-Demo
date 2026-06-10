interface GadScoreData {
  gad_score: number;
  ai_score: number;
  narrative_score: number;
  hype_score: number;
  whale_score: number;
  risk_score: number;
  survival_score: number;
  rug_probability: number;
  explanation?: string;
}

interface Props {
  data: GadScoreData | null;
  compact?: boolean;
}

const ratingConfig: Record<string, { color: string; bg: string; label: string }> = {
  LEGENDARY: { color: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/30', label: '🌟 LEGENDARY' },
  STRONG:    { color: 'text-green-300',  bg: 'bg-green-500/10 border-green-500/30',   label: '💪 STRONG' },
  GOOD:      { color: 'text-emerald-300',bg: 'bg-emerald-500/10 border-emerald-500/30',label: '✅ GOOD' },
  NEUTRAL:   { color: 'text-gray-300',   bg: 'bg-gray-500/10 border-gray-500/30',     label: '😐 NEUTRAL' },
  WEAK:      { color: 'text-orange-300', bg: 'bg-orange-500/10 border-orange-500/30', label: '⚠️ WEAK' },
  DANGEROUS: { color: 'text-red-300',    bg: 'bg-red-500/10 border-red-500/30',       label: '💀 DANGEROUS' },
};

function getRating(score: number): string {
  return score >= 88 ? 'LEGENDARY' : score >= 75 ? 'STRONG' : score >= 60 ? 'GOOD' :
    score >= 40 ? 'NEUTRAL' : score >= 25 ? 'WEAK' : 'DANGEROUS';
}

function Bar({ label, value, inverted = false, color = 'bg-purple-500' }: {
  label: string; value: number; inverted?: boolean; color?: string;
}) {
  const display = inverted ? 100 - value : value;
  const barColor = display >= 70 ? 'bg-green-500' : display >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
        <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(100, display)}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-300 w-6 text-right">{value}</span>
    </div>
  );
}

export default function GadScore({ data, compact = false }: Props) {
  if (!data) {
    return (
      <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-4 text-center">
        <p className="text-gray-500 text-xs">GAD Score not yet computed</p>
      </div>
    );
  }

  const rating = getRating(data.gad_score);
  const cfg = ratingConfig[rating] ?? ratingConfig.NEUTRAL;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold ${cfg.bg} ${cfg.color}`}>
        <span className="font-mono text-lg">{data.gad_score}</span>
        <span className="text-xs opacity-70">{cfg.label.split(' ')[1]}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-5 ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">GAD Score</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-black font-mono ${cfg.color}`}>{data.gad_score}</span>
            <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
          </div>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>AI: <span className="text-white">{data.ai_score}</span></div>
          <div>Risk: <span className="text-white">{data.risk_score}</span></div>
          <div>Rug: <span className="text-white">{data.rug_probability}%</span></div>
        </div>
      </div>

      <div className="space-y-2">
        <Bar label="AI Score"   value={data.ai_score} />
        <Bar label="Narrative"  value={data.narrative_score} />
        <Bar label="Hype"       value={data.hype_score} />
        <Bar label="Whale"      value={data.whale_score} />
        <Bar label="Risk"       value={data.risk_score} inverted />
        <Bar label="Survival"   value={data.survival_score} />
        <Bar label="Rug Risk"   value={data.rug_probability} inverted />
      </div>

      {data.explanation && (
        <p className="text-xs text-gray-400 mt-3 italic">{data.explanation}</p>
      )}
    </div>
  );
}
