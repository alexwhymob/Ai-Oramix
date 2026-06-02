import { useMemo } from 'react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Users, ClipboardList, TrendingUp, CheckCircle2, ArrowRight, Clock, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getMaturityLevel } from '@/lib/scoring';
import ScoreBadge from '@/components/ScoreBadge';

export default function AdminDashboard() {
  const { user, isAccountManager } = useCurrentUser();
  const { data: allAssessments = [] } = useQuery({ queryKey: ['all_assessments'], queryFn: () => base44.entities.Assessment.list('-completed_at') });
  const { data: allCustomers = [] } = useQuery({ queryKey: ['all_customers'], queryFn: () => base44.entities.Customer.list() });

  // Account Manager only sees their own customers
  const customers = useMemo(() => isAccountManager && user ? allCustomers.filter(c => c.account_manager_id === user.id || c.created_by_id === user.id) : allCustomers, [allCustomers, isAccountManager, user]);
  const ownCustomerIds = useMemo(() => new Set(customers.map(c => c.id)), [customers]);
  const assessments = useMemo(() => {
    const main = allAssessments.filter(a => a.assessment_type !== 'sub_assessment');
    return isAccountManager ? main.filter(a => ownCustomerIds.has(a.customer_id)) : main;
  }, [allAssessments, isAccountManager, ownCustomerIds]);

  const customerMap = useMemo(() => { const m = {}; customers.forEach(c => { m[c.id] = c; }); return m; }, [customers]);
  const completed = assessments.filter(a => a.status === 'completed');
  const inProgress = assessments.filter(a => a.status === 'in_progress');
  const avgScore = completed.length > 0 ? completed.reduce((s, a) => s + (a.global_score || 0), 0) / completed.length : 0;

  const levelCounts = { 'Não Preparado': 0, 'Emergente': 0, 'Em Desenvolvimento': 0, 'Preparado': 0, 'Avançado': 0 };
  const levelColors = { 'Não Preparado': '#ef4444', 'Emergente': '#f97316', 'Em Desenvolvimento': '#eab308', 'Preparado': '#22c55e', 'Avançado': '#3b82f6' };
  completed.forEach(a => {
    const l = getMaturityLevel(a.global_score);
    const k = l.label_pt;
    if (k in levelCounts) levelCounts[k]++;
  });
  const chartData = Object.entries(levelCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: 'Total Customers', value: customers.length, icon: <Users className="w-5 h-5" />, color: 'text-blue-400' },
    { label: 'Completed', value: completed.length, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-400' },
    { label: 'In Progress', value: inProgress.length, icon: <Clock className="w-5 h-5" />, color: 'text-yellow-400' },
    { label: 'Avg Score', value: avgScore > 0 ? `${avgScore.toFixed(2)}/5` : '—', icon: <TrendingUp className="w-5 h-5" />, color: 'text-purple-400' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-[#152233] border border-white/10 rounded-xl p-4">
            <div className={`${s.color} mb-2`}>{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-[#152233] border border-white/10 rounded-xl p-5 lg:col-span-1">
            <h3 className="text-sm font-semibold text-white/70 mb-4">Maturity Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#ffffff40' }} />
                <YAxis tick={{ fontSize: 10, fill: '#ffffff40' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#152233', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={levelColors[entry.name] || '#3b82f6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick links */}
        <div className="bg-[#152233] border border-white/10 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link to="/admin/customers" className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <span className="text-sm text-white">Manage Customers</span>
              <ArrowRight className="w-4 h-4 text-white/40" />
            </Link>
            <Link to="/admin/customers" className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <span className="text-sm text-white">Register New Customer</span>
              <ArrowRight className="w-4 h-4 text-white/40" />
            </Link>
          </div>
        </div>
      </div>

      {/* Pillar Radar Grid */}
      {completed.length > 0 && (
        <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Maturity Radar — All Customers</h3>
            <span className="text-xs text-white/30 ml-1">{completed.length} completed</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {completed.map(a => {
              const c = customerMap[a.customer_id];
              let scores = [];
              try { scores = JSON.parse(a.pillar_scores || '[]'); } catch {}
              const radarData = scores.map(p => ({ subject: p.name_pt?.slice(0, 8) || p.code, score: p.score || 0, fullMark: 5 }));
              const level = getMaturityLevel(a.global_score);
              return (
                <Link key={a.id} to={`/admin/assessment/${a.id}`} className="bg-[#0f1d2e] border border-white/10 rounded-xl p-4 hover:border-blue-500/40 transition-all group block">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">{c?.company || '—'}</div>
                      <div className="text-xs text-white/40 truncate">{c?.name}</div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <div className="text-lg font-black text-brand-blue leading-none">{a.global_score?.toFixed(1)}</div>
                      <div className="text-[10px] text-white/30">/5.0</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: { red:'#ef4444', orange:'#f97316', yellow:'#eab308', green:'#22c55e', blue:'#3b82f6', gray:'#6b7280' }[level.color] }}>
                      {level.emoji} {level.label_pt}
                    </span>
                    {a.reviewed_by_consultant && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300 bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.5 rounded-full font-medium">
                        <Award className="w-2.5 h-2.5" /> Reviewed
                      </span>
                    )}
                  </div>
                  {radarData.length > 0 && (
                    <ResponsiveContainer width="100%" height={140}>
                      <RadarChart data={radarData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} />
                        <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                        <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={1.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                  <div className="grid grid-cols-3 gap-1 mt-2">
                    {scores.slice(0, 6).map(p => (
                      <div key={p.code} className="text-center">
                        <div className="text-[10px] text-white/30 truncate">{p.name_pt?.slice(0, 6)}</div>
                        <div className="text-xs font-bold" style={{ color: p.score < 2 ? '#ef4444' : p.score < 3 ? '#f97316' : p.score < 3.6 ? '#eab308' : p.score < 4.3 ? '#22c55e' : '#3b82f6' }}>{p.score?.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent assessments */}
      <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-white/60" />
          <h3 className="text-sm font-semibold text-white">Recent Assessments</h3>
        </div>
        <div className="divide-y divide-white/5">
          {assessments.slice(0, 10).map(a => {
            const c = customerMap[a.customer_id];
            return (
              <div key={a.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{c?.company || '—'}</div>
                  <div className="text-xs text-white/40">{c?.name} · {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : 'In progress'}</div>
                </div>
                {a.status === 'completed' && a.reviewed_by_consultant ? (
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={a.global_score} lang="en" />
                    <span className="inline-flex items-center gap-1 text-xs text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                      <Award className="w-3 h-3" /> Reviewed
                    </span>
                  </div>
                ) : a.status === 'completed' ? (
                  <ScoreBadge score={a.global_score} lang="en" />
                ) : (
                  <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">In Progress</span>
                )}
                {a.status === 'completed' && (
                  <Link to={`/admin/assessment/${a.id}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap">
                    View →
                  </Link>
                )}
              </div>
            );
          })}
          {assessments.length === 0 && (
            <div className="px-5 py-8 text-center text-white/30 text-sm">No assessments yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
