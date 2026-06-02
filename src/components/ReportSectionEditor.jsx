import { useState } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReportSectionRenderer from './ReportSectionRenderer';

export default function ReportSectionEditor({ number, title, content, onSave, sectionKey, extraData }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(content || '');

  const handleSave = () => {
    onSave(value);
    setEditing(false);
  };

  const handleCancel = () => {
    setValue(content || '');
    setEditing(false);
  };

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-[#152233]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0f1d2e]">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {number}
          </span>
          <h3 className="font-semibold text-white text-sm">{title}</h3>
          {content && <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">✓</span>}
        </div>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-white/50 hover:text-white gap-1.5 h-7">
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave} className="bg-blue-500 hover:bg-blue-600 h-7 gap-1">
              <Check className="w-3.5 h-3.5" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel} className="text-white/50 hover:text-white h-7">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      <div className="p-5">
        {editing ? (
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full min-h-[200px] bg-[#0D1B2A] border border-white/10 rounded-lg p-3 text-sm text-white/80 font-mono resize-y focus:outline-none focus:border-blue-500/50"
            placeholder="Write content in Markdown..."
          />
        ) : content ? (
          <div id={`report-section-content-${sectionKey}`}>
            <ReportSectionRenderer sectionKey={sectionKey} content={content} extraData={extraData} />
          </div>
        ) : (
          <p className="text-white/30 text-sm italic">
            Content not yet generated. Click "Generate with AI" above or edit manually.
          </p>
        )}
      </div>
    </div>
  );
}