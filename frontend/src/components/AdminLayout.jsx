import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Brain, LogOut, ChevronRight, Settings, Activity, Layers3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AdminLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().
    then((u) => {
      const allowed = ['admin', 'ai_consultant', 'account_manager'];
      if (u && allowed.includes(u.role)) {
        setUser(u);
      } else {
        base44.auth.redirectToLogin(location.pathname);
      }
      setLoading(false);
    }).
    catch(() => {
      base44.auth.redirectToLogin('/admin');
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>);


  if (!user) return null;

  const navItems = [
  { to: '/admin', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
  { to: '/admin/customers', icon: <Users className="w-4 h-4" />, label: 'Clientes / Customers' },
  ...(['admin'].includes(user.role) ? [
    { to: '/admin/assessment-templates', icon: <Layers3 className="w-4 h-4" />, label: 'Assessment Templates' },
    { to: '/admin/report-templates', icon: <Layers3 className="w-4 h-4" />, label: 'Report Templates' }
  ] : []),
  ...(['admin', 'ai_consultant'].includes(user.role) ? [{ to: '/admin/audit-logs', icon: <Activity className="w-4 h-4" />, label: 'Audit Logs' }] : []),
  { to: '/admin/configuration', icon: <Settings className="w-4 h-4" />, label: 'Configuration' }];


  return (
    <div className="flex h-screen bg-[#0D1B2A] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-[#091523] border-r border-white/10 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[hsl(var(--primary))]">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-white leading-none">Oramix</div>
              <div className="text-[10px] text-white/40 mt-0.5">AI Readiness</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white hover:bg-white/5'}`
                }>
                
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3" />}
              </Link>);

          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/40 truncate">{user.full_name || user.email}</div>
          <div className="text-[10px] text-blue-400/70 mb-2 capitalize">{user.role?.replace('_', ' ')}</div>
          <button
            onClick={() => base44.auth.logout('/')}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
            
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>);

}
