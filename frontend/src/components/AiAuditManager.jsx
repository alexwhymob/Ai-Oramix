import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Bot, ChevronDown, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AiAuditManager() {
  const [expandedId, setExpandedId] = useState(null);
  const { data: records = [], isLoading, isError, error } = useQuery({
    queryKey: ['llm-audit-logs'],
    queryFn: () => base44.entities.LlmAuditLog.list('-created_date', 100)
  });
  const totals = records.reduce((value, item) => ({
    calls: value.calls + 1,
    errors: value.errors + (item.status === 'error' ? 1 : 0),
    duration: value.duration + (item.duration_ms || 0),
    cost: value.cost + (item.estimated_cost_usd || 0)
  }), { calls: 0, errors: 0, duration: 0, cost: 0 });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>;
  if (isError) return <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-5 text-sm text-red-200">Unable to load the AI audit records: {error.message}</div>;
  return <div className="space-y-4">
    <div className="bg-[#152233] border border-white/10 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white flex gap-2"><Activity className="w-4 h-4 text-blue-400" /> AI Audit</h2>
      <p className="text-xs text-white/50 mt-1">Operational metadata only. Prompts, context and responses are not stored in telemetry.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
        <Metric label="Calls" value={totals.calls} /><Metric label="Errors" value={totals.errors} /><Metric label="Average time" value={totals.calls ? `${Math.round(totals.duration / totals.calls)} ms` : '—'} /><Metric label="Estimated cost" value={`$${totals.cost.toFixed(4)}`} />
      </div>
    </div>
    <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
      {records.map((item) => <AuditRecord key={item.id} item={item} expanded={expandedId === item.id} onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)} />)}
      {!records.length && <div className="p-8 text-center text-sm text-white/35">No AI calls recorded yet.</div>}
    </div>
  </div>;
}

function Metric({ label, value }) { return <div className="bg-[#0D1B2A] rounded-lg p-3"><div className="text-white/40 text-xs">{label}</div><div className="text-white mt-1">{value}</div></div>; }

function AuditRecord({ item, expanded, onToggle }) {
  return <div className="border-b border-white/5 last:border-b-0 text-xs">
    <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/[0.03] transition-colors">
      <Bot className="w-4 h-4 text-purple-400 shrink-0" />
      <div className="flex-1 min-w-0"><span className="text-white">{item.model}</span><span className="text-white/40"> · {item.operation}</span></div>
      <span className={item.status === 'success' ? 'text-green-300' : 'text-red-300'}>{item.status}</span><span className="text-white/50 whitespace-nowrap">{item.duration_ms} ms</span><span className="text-white/35 whitespace-nowrap hidden md:inline">{new Date(item.created_date).toLocaleString()}</span>
      <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
    </button>
    {expanded && <div className="mx-4 mb-4 rounded-lg bg-[#0D1B2A] p-4 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-xs">
      <Detail label="Provider" value={item.provider} /><Detail label="Model" value={item.model} /><Detail label="Operation" value={item.operation} /><Detail label="Status" value={item.status} />
      <Detail label="Duration" value={`${item.duration_ms ?? '—'} ms`} /><Detail label="Input tokens" value={item.input_tokens ?? 'Not reported'} /><Detail label="Output tokens" value={item.output_tokens ?? 'Not reported'} /><Detail label="Total tokens" value={item.total_tokens ?? 'Not reported'} />
      <Detail label="Estimated cost" value={item.estimated_cost_usd == null ? 'Not configured' : `$${item.estimated_cost_usd.toFixed(6)}`} /><Detail label="Error code" value={item.error_code || 'None'} /><Detail label="Recorded at" value={new Date(item.created_date).toLocaleString()} />
    </div>}
  </div>;
}

function Detail({ label, value }) { return <div><div className="text-white/40">{label}</div><div className="text-white mt-1 break-words">{value}</div></div>; }
