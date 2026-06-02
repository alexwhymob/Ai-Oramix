import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AssessmentRadar({ pillarScores = [], lang = 'pt', dark = false }) {
  const data = pillarScores.map(p => ({
    subject: lang === 'en' ? (p.name_en || p.name_pt) : p.name_pt,
    score: p.score || 0,
    fullMark: 5,
  }));

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
      No data available
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke={dark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'} />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,0.7)' : '#64748b' }}
        />
        <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(v) => [`${v.toFixed(2)}/5`, 'Score']}
          contentStyle={{
            background: dark ? '#152233' : '#fff',
            border: '1px solid #3b82f6',
            borderRadius: 8,
            color: dark ? '#fff' : '#0f172a',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}