export default function QuestionCard({ question, value, onChange, lang, readOnly = false, questionNumber }) {
  const text = lang === 'en' ? (question.text_en || question.text_pt) : question.text_pt;

  const anchors = [1, 2, 3, 4, 5].map(n => ({
    value: n,
    label: lang === 'en'
      ? (question[`anchor_${n}_en`] || question[`anchor_${n}_pt`] || '')
      : (question[`anchor_${n}_pt`] || ''),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
          {questionNumber ?? question.code}
        </span>
        <p className="text-base font-medium text-foreground leading-snug">{text}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pl-10">
        {anchors.map(anchor => (
          <button
            key={anchor.value}
            onClick={() => !readOnly && onChange && onChange(anchor.value)}
            disabled={readOnly}
            className={`p-3 rounded-xl border-2 text-left transition-all duration-150 ${
              value === anchor.value
                ? 'border-brand-blue bg-blue-50 shadow-sm'
                : readOnly
                  ? 'border-border bg-muted/30 opacity-60'
                  : 'border-border hover:border-brand-blue/40 hover:bg-accent cursor-pointer'
            }`}
          >
            <div className={`text-xl font-bold mb-1 ${value === anchor.value ? 'text-brand-blue' : 'text-muted-foreground'}`}>
              {anchor.value}
            </div>
            <div className={`text-xs leading-tight ${value === anchor.value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {anchor.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}