import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { getLevelDisplayColor, useMaturityData } from '@/lib/useMaturity';

const scoreColor = (s) => s < 2 ? '#ef4444' : s < 3 ? '#f97316' : s < 3.6 ? '#eab308' : s < 4.3 ? '#22c55e' : '#3b82f6';

export default function ReportVisualsExport({ pillarScores = [], globalScore, lang = 'pt', customer, template = null }) {
  const { resolveLevel } = useMaturityData();
  const presetId = template?.maturity_preset_id || null;
  const level = resolveLevel(globalScore, presetId);
  const color = getLevelDisplayColor(level, scoreColor(globalScore));
  const pct = (globalScore / 5) * 100;
  const r = 56;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const templateLabel = template ? (lang === 'en' ? template.name_en || template.name_pt : template.name_pt) : null;

  const radarData = pillarScores.map((p) => ({
    subject: ((lang === 'en' ? p.name_en : p.name_pt) || p.code)?.slice(0, 12),
    score: p.score || 0,
    fullMark: 5
  }));

  const barData = pillarScores.map((p) => ({
    shortName: ((lang === 'en' ? p.name_en : p.name_pt) || p.code).slice(0, 18),
    score: parseFloat((p.score || 0).toFixed(2)),
    color: getLevelDisplayColor(resolveLevel(p.score, presetId), scoreColor(p.score))
  }));

  const bg = '#0f1d2e';
  const cardBg = '#152233';
  const border = 'rgba(255,255,255,0.1)';

  return (
    <div style={{ width: 900, background: bg, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', gap: 16, padding: '16px 16px 8px' }}>
        <div id="vx-score" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2 }}>Global Score</div>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
            />
            <text x="70" y="65" textAnchor="middle" fill="white" fontSize="28" fontWeight="900">
              {globalScore?.toFixed(1)}
            </text>
            <text x="70" y="83" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="13">
              /5.0
            </text>
          </svg>
          <div style={{ color, fontSize: 13, fontWeight: 700 }}>
            {level?.emoji} {lang === 'en' ? level?.label_en : level?.label_pt}
          </div>
          {customer && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>{customer.company}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{customer.sector} - {customer.company_size}</div>
              {templateLabel && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 4 }}>{templateLabel}</div>}
            </div>
          )}
        </div>

        <div id="vx-radar" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 16px 8px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Maturity Radar</div>
          <RadarChart width={640} height={280} data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }} />
            <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
          </RadarChart>
        </div>
      </div>

      <div style={{ padding: '0 16px 8px' }}>
        <div id="vx-bar" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, textAlign: 'center' }}>Pillar Scores</div>
          <BarChart width={860} height={220} data={barData} layout="vertical" margin={{ left: 8, right: 60, top: 0, bottom: 0 }}>
            <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }} tickCount={6} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} width={120} axisLine={false} tickLine={false} />
            <Bar dataKey="score" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, formatter: (value) => `${value}/5` }}>
              {barData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </div>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <div id="vx-grid" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {pillarScores.map((p) => {
            const entryColor = getLevelDisplayColor(resolveLevel(p.score, presetId), scoreColor(p.score));
            const entryPct = Math.round((p.score / 5) * 100);

            return (
              <div key={p.code} style={{ background: bg, borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                    {lang === 'en' ? p.name_en : p.name_pt}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: entryColor, flexShrink: 0 }}>{p.score?.toFixed(1)}</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${entryPct}%`, height: '100%', background: entryColor, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{p.weight}% weight</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
