import { CheckCircle2, Circle, ListChecks } from 'lucide-react';

export default function ReviewChecklist({ sections, reviewedKeys = [], onToggle }) {
  const availableSections = sections.filter((section) => section.content);
  const reviewed = availableSections.filter((section) => reviewedKeys.includes(section.key)).length;
  const allReviewed = availableSections.length > 0 && reviewed === availableSections.length;

  return (
    <section className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
          <ListChecks className="w-4 h-4 text-blue-400" />
          Checklist de revisão
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allReviewed ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>
          {reviewed}/{availableSections.length}{allReviewed ? ' ✓' : ''}
        </span>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {sections.map((section, index) => {
          const checked = reviewedKeys.includes(section.key);
          const available = Boolean(section.content);
          return (
            <button
              key={section.key}
              type="button"
              disabled={!available}
              onClick={() => onToggle(section.key)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${checked ? 'bg-green-500/10 hover:bg-green-500/15' : 'hover:bg-white/5'} ${available ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
            >
              {checked ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <Circle className="w-4 h-4 text-white/30 flex-shrink-0" />}
              <span className={`text-xs truncate ${checked ? 'text-green-300' : available ? 'text-white/70' : 'text-white/30'}`}>
                {index + 1}. {section.title}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
