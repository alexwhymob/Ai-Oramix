import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';

const scoreColor = (s) => s < 2 ? '#ef4444' : s < 3 ? '#f97316' : s < 3.6 ? '#eab308' : s < 4.3 ? '#22c55e' : '#3b82f6';
const bg = '#1a1508';
const cardBg = '#1e1a0a';
const border = 'rgba(249,115,22,0.2)';

export default function SubAssessmentVisualsExport({ subPillarScores = [], subAssessment, lang = 'pt', pillars = [] }) {
  const enriched = subPillarScores.map(ps => {
    const p = pillars.find(p => p.code === ps.code);
    return { ...ps, name_pt: p?.name_pt || ps.code, name_en: p?.name_en || ps.code };
  });

  const radarData = enriched.map(p => ({
    subject: ((lang === 'en' ? p.name_en : p.name_pt) || p.code)?.slice(0, 14),
    score: p.score || 0,
    fullMark: 5,
  }));

  const barData = enriched.map(p => ({
    shortName: ((lang === 'en' ? p.name_en : p.name_pt) || p.code).slice(0, 20),
    score: parseFloat((p.score || 0).toFixed(2)),
  }));

  const globalScore = subAssessment?.global_score;
  const pct = globalScore ? (globalScore / 5) * 100 : 0;
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = scoreColor(globalScore || 0);

  return (
    <div style={{ width: 900, background: bg, fontFamily: 'sans-serif' }}>

      {/* Row 1: Score ring + Radar */}
      <div style={{ display: 'flex', gap: 16, padding: '16px 16px 8px' }}>

        {/* Score ring */}
        <div id="vx-sub-score" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 180 }}>
          <div style={{ fontSize: 10, color: 'rgba(249,115,22,0.5)', textTransform: 'uppercase', letterSpacing: 2 }}>Sub-Assessment Score</div>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
            <circle cx="60" cy="60" r={r} fill="none" stroke="#f97316" strokeWidth="9"
              strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
              transform="rotate(-90 60 60)" />
            <text x="60" y="56" textAnchor="middle" fill="white" fontSize="24" fontWeight="900">{globalScore?.toFixed(1) || '–'}</text>
            <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="11">/5.0</text>
          </svg>
          <div style={{ color: '#f97316', fontSize: 12, fontWeight: 700 }}>Data Maturity</div>
        </div>

        {/* Radar */}
        <div id="vx-sub-radar" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px 8px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: 'rgba(249,115,22,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Data Maturity Radar</div>
          <RadarChart width={620} height={270} data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="rgba(249,115,22,0.15)" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }} />
            <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#f97316" fill="#f97316" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: '#f97316' }} />
          </RadarChart>
        </div>
      </div>

      {/* Row 2: Horizontal bar chart */}
      <div style={{ padding: '0 16px 8px' }}>
        <div id="vx-sub-bar" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px 8px' }}>
          <div style={{ fontSize: 10, color: 'rgba(249,115,22,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, textAlign: 'center' }}>Pillar Scores – Data Sub-Assessment</div>
          <BarChart width={860} height={200} data={barData} layout="vertical" margin={{ left: 8, right: 60, top: 0, bottom: 0 }}>
            <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickCount={6} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="shortName" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.55)' }} width={130} axisLine={false} tickLine={false} />
            <Bar dataKey="score" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600, formatter: v => `${v}/5` }}>
              {barData.map((entry, i) => <Cell key={i} fill={scoreColor(entry.score)} />)}
            </Bar>
          </BarChart>
        </div>
      </div>

      {/* Row 3: Pillar grid */}
      <div style={{ padding: '0 16px 16px' }}>
        <div id="vx-sub-grid" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {enriched.map(p => {
            const c = scoreColor(p.score);
            const pct = Math.round((p.score / 5) * 100);
            return (
              <div key={p.code} style={{ background: bg, borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{lang === 'en' ? p.name_en : p.name_pt}</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: c, flexShrink: 0 }}>{p.score?.toFixed(1)}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 3 }} />
                </div>
                {p.weight && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{p.weight}% weight</div>}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}