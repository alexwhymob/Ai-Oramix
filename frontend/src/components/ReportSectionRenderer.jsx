import ReactMarkdown from 'react-markdown';
import GapMapSection from './GapMapSection';

/* ─── Shared helpers ─── */
function splitBullets(text) {
  return (text || '')
    .split('\n')
    .map(l => l.replace(/^[-*•]\s+/, '').trim())
    .filter(Boolean);
}

function extractMarkdownSections(text) {
  const sections = [];
  let current = null;
  (text || '').split('\n').forEach(line => {
    const h = line.match(/^#{1,3}\s+(.*)/);
    if (h) {
      if (current) sections.push(current);
      current = { heading: h[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      sections.push({ heading: null, lines: [line] });
    }
  });
  if (current) sections.push(current);
  return sections;
}

/* ─── Improved narrative renderer (used for most sections) ─── */
function NarrativeSection({ content }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none
      [&>h1]:text-white [&>h1]:text-base [&>h1]:font-bold [&>h1]:mt-5 [&>h1]:mb-2
      [&>h2]:text-white [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mt-4 [&>h2]:mb-1.5 [&>h2]:border-b [&>h2]:border-white/10 [&>h2]:pb-1
      [&>h3]:text-blue-300 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mt-3 [&>h3]:mb-1
      [&>p]:text-white/75 [&>p]:leading-relaxed [&>p]:mb-3
      [&>ul]:space-y-1.5 [&>ul]:mb-3
      [&>ol]:space-y-1.5 [&>ol]:mb-3
      [&>ul>li]:text-white/70 [&>ul>li]:pl-1
      [&>ol>li]:text-white/70 [&>ol>li]:pl-1
      [&>blockquote]:border-l-2 [&>blockquote]:border-blue-400/50 [&>blockquote]:pl-3 [&>blockquote]:text-white/50 [&>blockquote]:italic
      [&>strong]:text-white [&>em]:text-white/80
      [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

/* ─── Shared numbered card list (used by sections 1-4, 6, 7, 8, 9) ─── */
function NumberedCards({ content }) {
  const secs = extractMarkdownSections(content).filter(s => s.heading);
  if (!secs.length) return <NarrativeSection content={content} />;
  return (
    <div className="space-y-3">
      {secs.map((sec, i) => (
        <div key={i} className="rounded-lg bg-[#0D1B2A] border border-white/5 p-4">
          <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
            {sec.heading}
          </h4>
          <NarrativeSection content={sec.lines.join('\n')} />
        </div>
      ))}
    </div>
  );
}

/* ─── Section 1: Executive Summary ─── */
function ExecutiveSummary({ content }) {
  return <NumberedCards content={content} />;
}

/* ─── Section 3: Results by Pillar ─── */
function PillarResults({ content }) {
  return <NumberedCards content={content} />;
}

/* ─── Consultant Notes panel (used in Section 6) ─── */
const LEVEL_COLORS = {
  high:   { bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/25',    label: 'High' },
  medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/25', label: 'Medium' },
  low:    { bg: 'bg-green-500/15',  text: 'text-green-400',  border: 'border-green-500/25',  label: 'Low' },
};

function getPillarLabel(pillarCode, pillars = []) {
  if (!pillarCode) return '';
  const pillar = pillars.find((item) => item.code === pillarCode);
  return pillar?.name_pt || pillar?.name_en || pillarCode;
}

function ConsultantNoteCards({ notes, pillars = [] }) {
  if (!notes || !notes.length) return null;
  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Consultant Notes &amp; Gap Analysis</p>
      <div className="space-y-3">
        {notes.map((note, i) => {
          const p = LEVEL_COLORS[note.priority] || LEVEL_COLORS.medium;
          const e = LEVEL_COLORS[note.effort]   || LEVEL_COLORS.medium;
          const pillarLabel = getPillarLabel(note.pillar_code, pillars);
          return (
            <div key={note.id || i} className="rounded-lg bg-[#0a1520] border border-white/10 p-4">
              <div className="flex flex-wrap gap-2 mb-2">
                {pillarLabel && (
                  <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded-full">{pillarLabel}</span>
                )}
                {note.priority && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${p.bg} ${p.text} ${p.border}`}>Priority: {p.label}</span>
                )}
                {note.effort && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${e.bg} ${e.text} ${e.border}`}>Effort: {e.label}</span>
                )}
              </div>
              {note.gap_description && (
                <p className="text-white/75 text-sm leading-relaxed mb-2">{note.gap_description}</p>
              )}
              {note.mitigation && (
                <div className="flex gap-2 items-start">
                  <span className="text-green-400 text-xs mt-0.5">&#8594;</span>
                  <p className="text-green-300/80 text-xs leading-relaxed">{note.mitigation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Section 6: Quick Wins ─── */
function QuickWins({ content, consultantNotes, pillars = [] }) {
  const secs = extractMarkdownSections(content).filter(s => s.heading);
  if (!secs.length) {
    const items = splitBullets(content);
    if (!items.length) return (
      <div>
        <NarrativeSection content={content} />
        <ConsultantNoteCards notes={consultantNotes} pillars={pillars} />
      </div>
    );
    return (
      <div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg bg-[#0D1B2A] border border-white/5">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-white/75 text-sm leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
        <ConsultantNoteCards notes={consultantNotes} pillars={pillars} />
      </div>
    );
  }
  return (
    <div>
      <div className="space-y-3">
        {secs.map((sec, i) => {
          const body = sec.lines.join('\n');
          const outcome = sec.lines.find(l => /outcome|result|expect|resul/i.test(l));
          const rest = sec.lines.filter(l => l !== outcome).join('\n');
          return (
            <div key={i} className="rounded-lg bg-[#0D1B2A] border border-white/5 p-4">
              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm mb-1">{sec.heading}</p>
                  <NarrativeSection content={rest || body} />
                  {outcome && (
                    <p className="mt-2 text-xs text-green-400 bg-green-500/10 rounded px-2 py-1 border border-green-500/20">{outcome.replace(/^[-*]\s*/, '')}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ConsultantNoteCards notes={consultantNotes} pillars={pillars} />
    </div>
  );
}

/* ─── Section 7: Roadmap ─── */
function Roadmap({ content }) {
  const secs = extractMarkdownSections(content).filter(s => s.heading);
  if (!secs.length) return <NarrativeSection content={content} />;

  return (
    <div className="space-y-3">
      {secs.map((sec, i) => (
        <div key={i} className="rounded-lg bg-[#0D1B2A] border border-white/5 p-4">
          <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
            {sec.heading}
          </h4>
          <NarrativeSection content={sec.lines.join('\n')} />
        </div>
      ))}
    </div>
  );
}

/* ─── Section 8: Use Cases ─── */
function UseCases({ content }) {
  return <NumberedCards content={content} />;
}

/* ─── Section 9: Next Steps ─── */
function NextSteps({ content }) {
  return <NumberedCards content={content} />;
}

/* ─── Main renderer ─── */
export default function ReportSectionRenderer({ sectionKey, content, extraData }) {
  if (!content) return null;

  switch (sectionKey) {
    case 'section_1': return <ExecutiveSummary content={content} />;
    case 'section_2': return <NumberedCards content={content} />;
    case 'section_3': return <PillarResults content={content} />;
    case 'section_4': return <NumberedCards content={content} />;
    case 'section_5': return <GapMapSection content={content} />;
    case 'section_6': return <QuickWins content={content} consultantNotes={extraData?.consultantNotes} pillars={extraData?.pillars} />;
    case 'section_7': return <Roadmap content={content} />;
    case 'section_8': return <UseCases content={content} />;
    case 'section_9': return <NumberedCards content={content} />;
    default:          return <NarrativeSection content={content} />;
  }
}
