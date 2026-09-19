import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Activity, Bot, Check, Code2, Edit2, HelpCircle, KeyRound, Loader2, Mail, Power, Shield, UserPlus, Users } from 'lucide-react';
import AiAuditManager from '@/components/AiAuditManager';
import QuestionManager from '@/components/QuestionManager';
import NotificationManager from '@/components/NotificationManager';
import PresentationTemplateManager from '@/components/PresentationTemplateManager';
import AiProviderSettings from '@/components/AiProviderSettings';
import MaturityPresetManager from '@/components/MaturityPresetManager';
import MfaSettings from '@/components/MfaSettings';
import BrowserNotificationSettings from '@/components/BrowserNotificationSettings';
import HtmlFormatManager from '@/components/HtmlFormatManager';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  const [searchParams] = useSearchParams();
  const [savingId, setSavingId] = useState(null);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ai_consultant');
  const [inviting, setInviting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', role: 'ai_consultant', active: true, booking_url: '' });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all_users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const sortedUsers = useMemo(() => {
    return [...users].sort((left, right) => {
      if ((left.active ?? true) !== (right.active ?? true)) {
        return (left.active ?? true) ? -1 : 1;
      }
      return String(left.full_name || left.email).localeCompare(String(right.full_name || right.email));
    });
  }, [users]);

  const initialTab = ['users', 'questions', 'provider-ai', 'ai-audit', 'maturity', 'notifications', 'presentations', 'html'].includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'users';
  const initialTemplateId = searchParams.get('templateId') || 'all';
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-[#152233] border border-white/10 rounded-xl p-6 text-white/70">
          <h1 className="text-lg font-semibold text-white mb-1">Access Restricted</h1>
          <p className="text-sm text-white/50">Only admins can access configuration and user management.</p>
        </div>
      </div>
    );
  }

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole, inviteName);
      setInviteName('');
      setInviteEmail('');
      toast.success(`Invitation sent to ${inviteEmail}`);
      qc.invalidateQueries({ queryKey: ['all_users'] });
    } finally {
      setInviting(false);
    }
  };

  const handleToggleActive = async (user) => {
    setSavingId(user.id);
    try {
      await base44.users.updateUser(user.id, { active: !(user.active ?? true) });
      toast.success((user.active ?? true) ? 'User inactivated' : 'User activated');
      qc.invalidateQueries({ queryKey: ['all_users'] });
    } finally {
      setSavingId(null);
    }
  };

  const handleResendInvite = async (user) => {
    setSavingId(user.id);
    try {
      await base44.users.resendInvite(user.id, {
        email: user.email,
        full_name: user.full_name,
        role: user.role
      });
      toast.success(`Invitation resent to ${user.email}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleUnlockLogin = async (user) => {
    const justification = window.prompt(`Justification for unlocking ${user.email}:`);
    if (!justification?.trim()) return;

    setSavingId(user.id);
    try {
      await base44.users.unlockLogin(user.id, justification.trim());
      toast.success(`Login unlocked for ${user.email}`);
      qc.invalidateQueries({ queryKey: ['all_users'] });
    } finally {
      setSavingId(null);
    }
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'ai_consultant',
      active: user.active ?? true,
      booking_url: user.booking_url || ''
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      await base44.users.updateUser(editingUser.id, editForm);
      toast.success('User updated');
      setEditingUser(null);
      qc.invalidateQueries({ queryKey: ['all_users'] });
    } finally {
      setSavingEdit(false);
    }
  };

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
          <button onClick={() => setActiveTab('provider-ai')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'provider-ai' ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white/80'}`}>
            <Bot className="w-3.5 h-3.5" /> Provider AI
          </button>
          <button onClick={() => setActiveTab('ai-audit')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'ai-audit' ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white/80'}`}>
            <Activity className="w-3.5 h-3.5" /> AI Audit
          </button>
          <button onClick={() => setActiveTab('maturity')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'maturity' ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white/80'}`}>
            <Shield className="w-3.5 h-3.5" /> Maturity
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'notifications' ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white/80'}`}>
            <Mail className="w-3.5 h-3.5" /> Notifications
          </button>
          <button onClick={() => setActiveTab('presentations')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'presentations' ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white/80'}`}>
            <Shield className="w-3.5 h-3.5" /> Presentations
          </button>
          <button onClick={() => setActiveTab('html')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'html' ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white/80'}`}>
            <Code2 className="w-3.5 h-3.5" /> HTML Report
          </button>
        </div>
      </div>

      {activeTab === 'questions' && <QuestionManager initialTemplateId={initialTemplateId} />}
      {activeTab === 'provider-ai' && <AiProviderSettings />}
      {activeTab === 'ai-audit' && <AiAuditManager />}
      {activeTab === 'maturity' && <MaturityPresetManager />}
      {activeTab === 'notifications' && <NotificationManager />}
      {activeTab === 'presentations' && <PresentationTemplateManager />}
      {activeTab === 'html' && <HtmlFormatManager />}

      {activeTab === 'users' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MfaSettings />
            <BrowserNotificationSettings />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROLES.map((role) => (
              <div key={role.value} className="bg-[#152233] border border-white/10 rounded-xl p-4">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3 ${role.color} ${role.bg}`}>
                  <Shield className="w-3 h-3" /> {role.label}
                </div>
                <ul className="space-y-1">
                  {ROLE_PERMS[role.value].map((permission, index) => (
                    <li key={index} className="text-xs text-white/50 flex gap-2">
                      <Check className="w-3 h-3 text-white/30 flex-shrink-0 mt-0.5" /> {permission}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-[#152233] border border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Invite New User
            </h2>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                placeholder="Full name..."
                className="flex-1 min-w-40 bg-[#0D1B2A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="Email address..."
                className="flex-1 min-w-48 bg-[#0D1B2A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-[#0D1B2A] border-white/10 text-white w-44 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="bg-blue-500 hover:bg-blue-600 text-white gap-2">
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Send Invite
              </Button>
            </div>
          </div>

          <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
              <Users className="w-4 h-4 text-white/60" />
              <h2 className="text-sm font-semibold text-white">Internal Users</h2>
              <span className="text-xs text-white/30 ml-1">{sortedUsers.length} users</span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {sortedUsers.map((user) => {
                  const roleInfo = ROLES.find((role) => role.value === user.role) || ROLES[0];
                  const isSelf = user.id === currentUser?.id;
                  const isLoginLocked = user.login_locked_until && new Date(user.login_locked_until) > new Date();
                  return (
                    <div key={user.id} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-400">{(user.full_name || user.email || '?')[0].toUpperCase()}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{user.full_name || '-'}</div>
                        <div className="text-xs text-white/40 truncate">{user.email}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleInfo.color} ${roleInfo.bg}`}>
                            {roleInfo.label}{isSelf ? ' (you)' : ''}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${(user.active ?? true) ? 'bg-green-500/10 text-green-300' : 'bg-yellow-500/10 text-yellow-300'}`}>
                            {(user.active ?? true) ? 'Active' : 'Inactive'}
                          </span>
                          {isLoginLocked && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-300">
                              Login blocked ({user.login_failed_attempts || 0} failures)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {savingId === user.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                        <Button variant="ghost" size="icon" onClick={() => openEditUser(user)} className="text-white/60 hover:text-white" title="Edit user">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleResendInvite(user)} className="text-white/60 hover:text-blue-300" title="Resend invite">
                          <Mail className="w-4 h-4" />
                        </Button>
                        {isLoginLocked && (
                          <Button variant="ghost" size="icon" onClick={() => handleUnlockLogin(user)} className="text-white/60 hover:text-green-300" title="Unlock login">
                            <KeyRound className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(user)}
                          disabled={isSelf}
                          className={isSelf ? 'text-white/20 cursor-not-allowed' : 'text-white/60 hover:text-yellow-300'}
                          title={(user.active ?? true) ? 'Inactivate user' : 'Activate user'}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {sortedUsers.length === 0 && <div className="px-5 py-8 text-center text-white/30 text-sm">No users found</div>}
              </div>
            )}
          </div>

          <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
            <DialogContent className="bg-[#152233] border border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Edit Internal User</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 block mb-1">Full name</label>
                  <Input value={editForm.full_name} onChange={(event) => setEditForm((prev) => ({ ...prev, full_name: event.target.value }))} className="bg-[#0D1B2A] border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Email</label>
                  <Input type="email" value={editForm.email} onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))} className="bg-[#0D1B2A] border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Booking URL</label>
                  <Input type="url" value={editForm.booking_url} onChange={(event) => setEditForm((prev) => ({ ...prev, booking_url: event.target.value }))} placeholder="https://..." className="bg-[#0D1B2A] border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Role</label>
                  <Select value={editForm.role} onValueChange={(value) => setEditForm((prev) => ({ ...prev, role: value }))}>
                    <SelectTrigger className="bg-[#0D1B2A] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Status</label>
                  <Select value={editForm.active ? 'active' : 'inactive'} onValueChange={(value) => setEditForm((prev) => ({ ...prev, active: value === 'active' }))}>
                    <SelectTrigger className="bg-[#0D1B2A] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setEditingUser(null)} className="text-white/50">Cancel</Button>
                <Button onClick={handleSaveUser} disabled={savingEdit || !editForm.full_name || !editForm.email} className="bg-blue-500 hover:bg-blue-600 text-white gap-2">
                  {savingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
