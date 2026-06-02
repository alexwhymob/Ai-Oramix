import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Shield, Loader2, Check, HelpCircle } from 'lucide-react';
import QuestionManager from '@/components/QuestionManager';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { toast } from 'sonner';

const ROLES = [
  { value: 'admin', label: 'Admin', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { value: 'ai_consultant', label: 'AI Consultant', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { value: 'account_manager', label: 'Account Manager', color: 'text-green-400', bg: 'bg-green-400/10' },
];

const ROLE_PERMS = {
  admin: ['Full access to all features'],
  ai_consultant: ['Edit reports & consultant notes (all assessments)', 'Cannot export PDF or send emails'],
  account_manager: ['Create & manage own customers', 'Access own customers\' assessments & reports', 'Export PDF & send emails'],
};

export default function AdminConfiguration() {
  const { user: currentUser, isAdmin } = useCurrentUser();
  const qc = useQueryClient();
  const [savingId, setSavingId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ai_consultant');
  const [inviting, setInviting] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all_users'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleRoleChange = async (userId, newRole) => {
    setSavingId(userId);
    await base44.entities.User.update(userId, { role: newRole });
    qc.invalidateQueries({ queryKey: ['all_users'] });
    setSavingId(null);
    toast.success('Role updated');
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole === 'admin' ? 'admin' : 'user');
    // After invite, update role if not admin (inviteUser only supports admin/user)
    setInviteEmail('');
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviting(false);
    qc.invalidateQueries({ queryKey: ['all_users'] });
  };

  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-400" /> Configuration
        </h1>
        <div className="flex gap-1 bg-[#152233] border border-white/10 rounded-lg p-1">
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white/80'}`}>
            <Users className="w-3.5 h-3.5" /> Users
          </button>
          <button onClick={() => setActiveTab('questions')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'questions' ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white/80'}`}>
            <HelpCircle className="w-3.5 h-3.5" /> Questions
          </button>
        </div>
      </div>

      {activeTab === 'questions' && <QuestionManager />}

      {activeTab === 'users' && <>
      {/* Role reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map(r => (
          <div key={r.value} className="bg-[#152233] border border-white/10 rounded-xl p-4">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3 ${r.color} ${r.bg}`}>
              <Shield className="w-3 h-3" /> {r.label}
            </div>
            <ul className="space-y-1">
              {ROLE_PERMS[r.value].map((p, i) => (
                <li key={i} className="text-xs text-white/50 flex gap-2">
                  <Check className="w-3 h-3 text-white/30 flex-shrink-0 mt-0.5" /> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Invite user */}
      {isAdmin && (
        <div className="bg-[#152233] border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Invite New User
          </h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="Email address..."
              className="flex-1 min-w-48 bg-[#0D1B2A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="bg-[#0D1B2A] border-white/10 text-white w-44 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="bg-blue-500 hover:bg-blue-600 text-white gap-2">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Send Invite
            </Button>
          </div>
        </div>
      )}

      {/* User list */}

      <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <Users className="w-4 h-4 text-white/60" />
          <h2 className="text-sm font-semibold text-white">Internal Users</h2>
          <span className="text-xs text-white/30 ml-1">{users.length} users</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map(u => {
              const roleInfo = ROLES.find(r => r.value === u.role) || ROLES[0];
              const isSelf = u.id === currentUser?.id;
              return (
                <div key={u.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-400">{(u.full_name || u.email || '?')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{u.full_name || '—'}</div>
                    <div className="text-xs text-white/40 truncate">{u.email}</div>
                  </div>
                  {isAdmin && !isSelf ? (
                    <div className="flex items-center gap-2">
                      {savingId === u.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                      <Select value={u.role || 'admin'} onValueChange={v => handleRoleChange(u.id, v)}>
                        <SelectTrigger className={`bg-[#0D1B2A] border-white/10 w-40 text-xs h-8 ${roleInfo.color}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleInfo.color} ${roleInfo.bg}`}>
                      {roleInfo.label}{isSelf ? ' (you)' : ''}
                    </span>
                  )}
                </div>
              );
            })}
            {users.length === 0 && <div className="px-5 py-8 text-center text-white/30 text-sm">No users found</div>}
          </div>
        )}
      </div>
      </>}
    </div>
  );
}