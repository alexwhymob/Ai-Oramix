import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, QrCode, Edit2, Trash2, ClipboardList, X, Loader2, Database, Award, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';

const SECTORS = ['Tecnologia', 'Saude', 'Industria', 'Retalho', 'Servicos Financeiros', 'Educacao', 'Energia', 'Logistica', 'Construcao', 'Outro'];
const SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
const EMPTY = {
  name: '',
  email: '',
  company: '',
  role: '',
  sector: '',
  company_size: '',
  language: 'pt',
  phone: '',
  notes: '',
  account_manager_id: '',
  template_id: ''
};

export default function AdminCustomers() {
  const { user, isAccountManager, isAiConsultant } = useCurrentUser();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [qrCustomer, setQrCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterCompletion, setFilterCompletion] = useState('');

  const { data: allCustomers = [] } = useQuery({
    queryKey: ['all_customers'],
    queryFn: () => base44.entities.Customer.list('-created_date')
  });
  const { data: accountManagers = [] } = useQuery({
    queryKey: ['account_managers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !isAccountManager && !isAiConsultant
  });
  const { data: assessments = [] } = useQuery({
    queryKey: ['all_assessments'],
    queryFn: () => base44.entities.Assessment.list()
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['all_templates'],
    queryFn: () => base44.entities.AssessmentTemplate.list('order')
  });

  const amUsers = useMemo(
    () => accountManagers.filter(userRecord => userRecord.role === 'account_manager'),
    [accountManagers]
  );

  const customers = useMemo(() => (
    isAccountManager && user
      ? allCustomers.filter(customer => customer.account_manager_id === user.id || customer.created_by_id === user.id)
      : allCustomers
  ), [allCustomers, isAccountManager, user]);

  const mainAssessmentMap = useMemo(() => {
    const map = {};
    assessments
      .filter(assessment => assessment.assessment_type !== 'sub_assessment')
      .forEach(assessment => {
        if (!map[assessment.customer_id] || assessment.created_date > map[assessment.customer_id].created_date) {
          map[assessment.customer_id] = assessment;
        }
      });
    return map;
  }, [assessments]);

  const subAssessmentMap = useMemo(() => {
    const map = {};
    assessments
      .filter(assessment => assessment.assessment_type === 'sub_assessment' && assessment.parent_assessment_id)
      .forEach(assessment => {
        map[assessment.parent_assessment_id] = assessment;
      });
    return map;
  }, [assessments]);

  const templateMap = useMemo(() => {
    const map = {};
    templates.forEach(template => {
      map[template.id] = template;
    });
    return map;
  }, [templates]);

  const filtered = useMemo(() => customers.filter(customer => {
    const matchesSearch = !search
      || customer.name?.toLowerCase().includes(search.toLowerCase())
      || customer.company?.toLowerCase().includes(search.toLowerCase())
      || customer.email?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterSector && customer.sector !== filterSector) return false;

    const assessment = mainAssessmentMap[customer.id];
    if (filterTemplate && assessment?.assessment_template_id !== filterTemplate) return false;

    if (filterCompletion) {
      if (filterCompletion === 'no_assessment') return !assessment;
      if (!assessment) return false;
      return assessment.status === filterCompletion;
    }

    return true;
  }), [customers, search, filterSector, filterTemplate, filterCompletion, mainAssessmentMap]);

  const activeFiltersCount = [filterTemplate, filterSector, filterCompletion].filter(Boolean).length;

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(EMPTY);
    setEditCustomer(null);
    setSaveError('');
    setFormOpen(true);
  };

  const openEdit = (customer) => {
    const assessment = mainAssessmentMap[customer.id];
    setForm({
      name: customer.name || '',
      email: customer.email || '',
      company: customer.company || '',
      role: customer.role || '',
      sector: customer.sector || '',
      company_size: customer.company_size || '',
      language: customer.language || 'pt',
      phone: customer.phone || '',
      notes: customer.notes || '',
      account_manager_id: customer.account_manager_id || '',
      template_id: assessment?.assessment_template_id || ''
    });
    setEditCustomer(customer);
    setSaveError('');
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');

    if (editCustomer) {
      const { template_id, ...customerPayload } = form;
      await base44.entities.Customer.update(editCustomer.id, customerPayload);

      const assessment = mainAssessmentMap[editCustomer.id];
      if (assessment) {
        await base44.entities.Assessment.update(assessment.id, {
          assessment_template_id: template_id || null
        });
      }
    } else {
      const res = await base44.functions.invoke('quizSession', {
        action: 'adminRegister',
        form,
        templateId: form.template_id || undefined
      });

      if (res.data?.error === 'non_corporate_email') {
        setSaveError('Please use a corporate email address.');
        setSaving(false);
        return;
      }

      if (res.data?.error === 'job_title_required') {
        setSaveError('Job title is required.');
        setSaving(false);
        return;
      }
    }

    qc.invalidateQueries({ queryKey: ['all_customers'] });
    qc.invalidateQueries({ queryKey: ['all_assessments'] });
    setFormOpen(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteCustomer) return;
    await base44.entities.Customer.delete(deleteCustomer.id);
    qc.invalidateQueries({ queryKey: ['all_customers'] });
    setDeleteCustomer(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Clientes / Customers</h1>
        {!isAiConsultant && (
          <Button onClick={openCreate} className="bg-blue-500 hover:bg-blue-600 gap-2 text-white">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        )}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, company or email..."
          className="w-full bg-[#152233] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />

        <select
          value={filterTemplate}
          onChange={e => setFilterTemplate(e.target.value)}
          className="bg-[#152233] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 cursor-pointer"
        >
          <option value="">Todos os templates</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name_pt}{template.name_en ? ` / ${template.name_en}` : ''}
            </option>
          ))}
        </select>

        <select
          value={filterSector}
          onChange={e => setFilterSector(e.target.value)}
          className="bg-[#152233] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 cursor-pointer"
        >
          <option value="">Todos os sectores</option>
          {SECTORS.map(sector => <option key={sector} value={sector}>{sector}</option>)}
        </select>

        <select
          value={filterCompletion}
          onChange={e => setFilterCompletion(e.target.value)}
          className="bg-[#152233] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 cursor-pointer"
        >
          <option value="">Todos os estados</option>
          <option value="completed">Concluido</option>
          <option value="in_progress">Em curso</option>
          <option value="not_started">Nao iniciado</option>
          <option value="no_assessment">Sem avaliacao</option>
        </select>

        {activeFiltersCount > 0 && (
          <button
            onClick={() => {
              setFilterTemplate('');
              setFilterSector('');
              setFilterCompletion('');
            }}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors ml-1"
          >
            <X className="w-3 h-3" />
            Limpar filtros ({activeFiltersCount})
          </button>
        )}

        <span className="ml-auto text-xs text-white/30">
          {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs">
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Company</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Sector</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Template</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Data Sub-Assessment</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(customer => {
                const assessment = mainAssessmentMap[customer.id];
                return (
                  <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-white">{customer.name}</div>
                      <div className="text-xs text-white/40">{customer.email}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="text-white/80">{customer.company}</div>
                      <div className="text-xs text-white/40">{customer.role}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-white/60">{customer.sector || '—'}</td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-white/60">
                      {assessment?.assessment_template_id && templateMap[assessment.assessment_template_id]
                        ? (templateMap[assessment.assessment_template_id].name_pt || templateMap[assessment.assessment_template_id].name_en)
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {!assessment ? (
                        <span className="text-xs text-white/30">No assessment</span>
                      ) : assessment.status === 'completed' && assessment.reviewed_by_consultant ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                          <Award className="w-3 h-3" />
                          Reviewed
                        </span>
                      ) : assessment.status === 'completed' ? (
                        <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">✓ Completed</span>
                      ) : assessment.status === 'in_progress' ? (
                        <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">In Progress</span>
                      ) : (
                        <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">Not Started</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden xl:table-cell">
                      {(() => {
                        const subAssessment = assessment ? subAssessmentMap[assessment.id] : null;
                        if (!assessment || assessment.status !== 'completed') return <span className="text-xs text-white/20">—</span>;
                        if (!subAssessment) return <span className="text-xs text-white/30">Not triggered</span>;
                        if (subAssessment.status === 'completed') {
                          return (
                            <div className="flex items-center gap-1.5">
                              <Database className="w-3 h-3 text-orange-400" />
                              <span className="text-xs text-orange-300 bg-orange-400/10 px-2 py-0.5 rounded-full">✓ Sub completed</span>
                            </div>
                          );
                        }
                        if (subAssessment.status === 'in_progress') {
                          return (
                            <div className="flex items-center gap-1.5">
                              <Database className="w-3 h-3 text-yellow-400" />
                              <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">In Progress</span>
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1.5">
                            <Database className="w-3 h-3 text-orange-500" />
                            <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">Pending</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {assessment?.status === 'completed' && (
                          <Link to={`/admin/assessment/${assessment.id}`} title="View assessment">
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-white/40 hover:text-white">
                              <ClipboardList className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}
                        {customer.qr_token && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-white/40 hover:text-blue-400"
                            onClick={() => setQrCustomer(customer)}
                            title="Show QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {!isAiConsultant && (
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-white/40 hover:text-white" onClick={() => openEdit(customer)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {!isAiConsultant && !isAccountManager && (
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-white/40 hover:text-red-400" onClick={() => setDeleteCustomer(customer)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/30 text-sm">No customers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Full Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Label>Company *</Label><Input value={form.company} onChange={e => set('company', e.target.value)} className="mt-1" /></div>
            <div><Label>Job Title *</Label><Input value={form.role} onChange={e => set('role', e.target.value)} className="mt-1" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Sector</Label>
              <Select value={form.sector} onValueChange={v => set('sector', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{SECTORS.map(sector => <SelectItem key={sector} value={sector}>{sector}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Company Size</Label>
              <Select value={form.company_size} onValueChange={v => set('company_size', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{SIZES.map(size => <SelectItem key={size} value={size}>{size}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={form.language} onValueChange={v => set('language', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">PT Portugues</SelectItem>
                  <SelectItem value="en">EN English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Assessment Template {!editCustomer && '*'}</Label>
              <Select value={form.template_id || 'none'} onValueChange={v => set('template_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select template..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {templates.filter(template => template.active).map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name_pt}{template.name_en ? ` / ${template.name_en}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Account Manager</Label>
              <Select value={form.account_manager_id || 'none'} onValueChange={v => set('account_manager_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Assign account manager..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {amUsers.map(userRecord => <SelectItem key={userRecord.id} value={userRecord.id}>{userRecord.full_name || userRecord.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => set('notes', e.target.value)} className="mt-1" placeholder="Internal notes..." /></div>
          </div>
          {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} className="flex-1">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.email || !form.company || !form.role || (!editCustomer && !form.template_id)}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white gap-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editCustomer ? 'Save Changes' : 'Create & Generate QR'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrCustomer} onOpenChange={() => setQrCustomer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>QR Code – {qrCustomer?.company}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground text-center">{qrCustomer?.name}</p>
          {qrCustomer?.qr_token && <QRCodeDisplay token={qrCustomer.qr_token} size={200} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCustomer} onOpenChange={() => setDeleteCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete <strong>{deleteCustomer?.name}</strong> ({deleteCustomer?.company})? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
