/**
 * Parses a markdown table from section_5 (Gap Map) and renders it as a
 * properly styled, color-coded UI table.
 */

const LEVEL_STYLES = {
  H: { label: 'High',   bg: 'bg-red-500/20',    text: 'text-red-400',    border: 'border-red-500/30' },
  M: { label: 'Medium', bg: 'bg-yellow-500/20',  text: 'text-yellow-400', border: 'border-yellow-500/30' },
  L: { label: 'Low',    bg: 'bg-green-500/20',   text: 'text-green-400',  border: 'border-green-500/30' },
};

const PRIORITY_STYLES = {
  1: 'bg-red-500/20 text-red-300 border-red-500/30',
  2: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  3: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  4: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  5: 'bg-green-500/20 text-green-300 border-green-500/30',
};

function Badge({ value }) {
  const key = String(value || '').trim().toUpperCase().charAt(0);
  const style = LEVEL_STYLES[key];
  if (!style) return <span className="text-white/50 text-xs">{value || '—'}</span>;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

function PriorityBadge({ value }) {
  const num = parseInt(String(value || '').trim(), 10);
  const cls = PRIORITY_STYLES[num] || 'bg-white/10 text-white/50 border-white/10';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {isNaN(num) ? (value || '—') : `P${num}`}
    </span>
  );
}

function parseMarkdownTable(markdown) {
  if (!markdown) return [];
  const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);
  const tableLines = lines.filter(l => l.startsWith('|'));
  if (tableLines.length < 2) return [];

  // first line = headers, second = separator, rest = rows
  const headers = tableLines[0].split('|').map(h => h.trim()).filter(Boolean);
  const rows = tableLines.slice(2).map(line =>
    line.split('|').map(cell => cell.trim()).filter(Boolean)
  ).filter(r => r.length > 0);

  return rows.map(cells => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
    return obj;
  });
}

export default function GapMapSection({ content }) {
  const rows = parseMarkdownTable(content);

  if (!rows.length) {
    return <p className="text-white/30 text-sm italic">No gap map data found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0D1B2A] border-b border-white/10">
            <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider w-full">Gap</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap">Impact</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap">Effort</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap">Priority</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const gap = row['Gap'] || row['gap'] || Object.values(row)[0] || '';
            const impact = row['Impact'] || row['impact'] || row['Impacto'] || '';
            const effort = row['Effort'] || row['effort'] || row['Esforço'] || row['Esforco'] || '';
            const priority = row['Priority'] || row['priority'] || row['Prioridade'] || '';
            return (
              <tr key={i} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? 'bg-[#0D1B2A]' : 'bg-[#0a1520]'}`}>
                <td className="px-4 py-3 text-white/80 leading-snug">{gap}</td>
                <td className="px-4 py-3 text-center"><Badge value={impact} /></td>
                <td className="px-4 py-3 text-center"><Badge value={effort} /></td>
                <td className="px-4 py-3 text-center"><PriorityBadge value={priority} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}