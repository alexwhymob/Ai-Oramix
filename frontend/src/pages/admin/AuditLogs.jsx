import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Loader2, Search, ShieldAlert } from 'lucide-react';
import { apiRequest } from '@/api/apiClient';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function AdminAuditLogs() {
  const { isAdmin, isAiConsultant } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit_logs'],
    queryFn: () => apiRequest('/audit-logs?limit=200&sort_by=-created_date'),
    enabled: isAdmin || isAiConsultant
  });

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const text = [
        log.action,
        log.entity,
        log.entity_id,
        log.user_email,
        JSON.stringify(log.metadata || {})
      ].join(' ').toLowerCase();
      const matchesSearch = !search || text.includes(search.toLowerCase());
      return matchesAction && matchesSearch;
    });
  }, [actionFilter, logs, search]);

  const actions = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.action).filter(Boolean))).sort();
  }, [logs]);

  if (!isAdmin && !isAiConsultant) {
    return (
      <div className="p-6">
        <div className="bg-[#152233] border border-white/10 rounded-xl p-6 text-white/70 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="text-lg font-semibold text-white mb-1">Access Restricted</h1>
            <p className="text-sm text-white/50">This page is available only for admins and AI consultants.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" /> Audit Logs
          </h1>
          <p className="text-sm text-white/40 mt-1">Recent application activity across auth, entities, reports, and integrations.</p>
        </div>
      </div>

      <div className="bg-[#152233] border border-white/10 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-60">
          <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by action, user, entity, or metadata..."
            className="w-full bg-[#0D1B2A] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          className="bg-[#0D1B2A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="all">All actions</option>
          {actions.map(action => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
      </div>

      <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <Activity className="w-4 h-4 text-white/60" />
          <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          <span className="text-xs text-white/30 ml-1">{filteredLogs.length} records</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLogs.map(log => (
              <div key={log.id} className="px-5 py-4 space-y-2 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-blue-300 bg-blue-400/10 border border-blue-400/20 px-2 py-1 rounded-full">{log.action}</span>
                    {log.entity && (
                      <span className="text-xs text-white/50">{log.entity}{log.entity_id ? ` · ${log.entity_id}` : ''}</span>
                    )}
                  </div>
                  <div className="text-xs text-white/35">
                    {new Date(log.created_date).toLocaleString()}
                  </div>
                </div>

                <div className="text-sm text-white/70 flex flex-wrap gap-x-4 gap-y-1">
                  <span>User: {log.user_email || 'Anonymous'}</span>
                  <span>Role: {log.user_role || 'N/A'}</span>
                  <span>IP: {log.ip || 'N/A'}</span>
                </div>

                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <pre className="text-xs text-white/45 bg-[#0D1B2A] border border-white/5 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="px-5 py-8 text-center text-white/30 text-sm">No audit records match the current filters.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
