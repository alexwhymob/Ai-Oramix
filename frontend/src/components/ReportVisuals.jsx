import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { getMaturityLevel } from '@/lib/scoring';

const scoreColor = (s) => s < 2 ? '#ef4444' : s < 3 ? '#f97316' : s < 3.6 ? '#eab308' : s < 4.3 ? '#22c55e' : '#3b82f6';

function ScoreRing({ score }) {
  const pct = (score / 5) * 100;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = scoreColor(score);
  const level = getMaturityLevel(score);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="50" y="46" textAnchor="middle" fill="white" fontSize="18" fontWeight="900">{score?.toFixed(1)}</text>
        <text x="50" y="60" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">/5.0</text>
      </svg>
      <span className="text-xs font-semibold" style={{ color }}>{level.emoji} {level.label_pt}</span>
    </div>
  );
}

export default function ReportVisuals({ pillarScores = [], globalScore, lang = 'pt', customer }) {
  const radarData = pillarScores.map(p => ({
    subject: (lang === 'en' ? p.name_en : p.name_pt)?.slice(0, 10) || p.code,
    score: p.score || 0,
    fullMark: 5,
  }));

  const barData = pillarScores.map(p => ({
    name: (lang === 'en' ? p.name_en : p.name_pt) || p.code,
    shortName: ((lang === 'en' ? p.name_en : p.name_pt) || p.code).slice(0, 14),
    score: parseFloat((p.score || 0).toFixed(2)),
    weight: p.weight,
  }));

  const CustomBarLabel = ({ x, y, width, value }) => (
    <text x={x + width + 6} y={y + 9} fill="rgba(255,255,255,0.6)" fontSize={11} fontWeight="600">{value}</text>
  );

  return (
    <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 text-xs font-semibold text-white/50 uppercase tracking-wider">
        Assessment Visuals — {customer?.company}
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

        {/* Score Ring */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-xs text-white/40 font-medium uppercase tracking-wider">Global Score</div>
          <ScoreRing score={globalScore} />
          {customer && (
            <div className="text-center">
              <div className="text-sm font-bold text-white">{customer.company}</div>
              <div className="text-xs text-white/40">{customer.sector} · {customer.company_size}</div>
            </div>
          )}
        </div>

        {/* Radar */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Maturity Radar</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }} />
              <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Horizontal Bar Chart */}
        <div className="flex flex-col">
          <div className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2 text-center">Pillar Scores</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 40, top: 0, bottom: 0 }}>
              <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickCount={6} />
              <YAxis type="category" dataKey="shortName" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.55)' }} width={80} />
              <Tooltip
                contentStyle={{ background: '#0f1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                formatter={(v, _, p) => [`${v}/5 (${p.payload.weight}%)`, 'Score']}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} label={<CustomBarLabel />}>
                {barData.map((entry, i) => <Cell key={i} fill={scoreColor(entry.score)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pillar score grid */}
      <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {pillarScores.map(p => {
          const color = scoreColor(p.score);
          const pct = Math.round((p.score / 5) * 100);
          return (
            <div key={p.code} className="bg-[#0f1d2e] rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-white/60 truncate mr-2">{lang === 'en' ? p.name_en : p.name_pt}</span>
                <span className="text-sm font-bold flex-shrink-0" style={{ color }}>{p.score?.toFixed(1)}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
              <div className="text-[10px] text-white/30 mt-1">{p.weight}% weight</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}