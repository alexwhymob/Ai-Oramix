import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/useLanguage';
import { base44 } from '@/api/base44Client';
import { isCorporateEmail } from '@/lib/blockedEmailDomains';

const SECTORS = ['Tecnologia','Saúde','Indústria','Retalho','Serviços Financeiros','Educação','Energia','Logística','Construção','Outro'];
const SIZES = ['1-10','11-50','51-200','201-500','501-1000','1000+'];

export default function CustomerRegister() {
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [form, setForm] = useState({ name:'', email:'', company:'', role:'', sector:'', company_size:'', language: lang });

  const t = (pt, en) => lang === 'pt' ? pt : en;
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleEmailChange = (v) => {
    set('email', v);
    if (v && !isCorporateEmail(v)) {
      setEmailError(t('Por favor use o seu email corporativo.', 'Please use your corporate email address.'));
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isCorporateEmail(form.email)) {
      setEmailError(t('Por favor use o seu email corporativo.', 'Please use your corporate email address.'));
      return;
    }
    setLoading(true);
    const res = await base44.functions.invoke('quizSession', { action: 'registerCustomer', form });
    if (res.data?.error) {
      setEmailError(t('Email corporativo obrigatório. Domínios pessoais não são aceites.', 'Corporate email required. Personal email domains are not accepted.'));
      setLoading(false);
      return;
    }
    navigate(`/quiz/${res.data.qr_token}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b max-w-2xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-foreground">Oramix</span>
        </Link>
        <LanguageToggle />
      </header>

      <div className="max-w-lg mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('Voltar', 'Back')}
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('Registar Avaliação', 'Register for Assessment')}</h1>
          <p className="text-muted-foreground">{t('Preencha os seus dados para iniciar a avaliação de maturidade em IA.', 'Fill in your details to start the AI readiness assessment.')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">{t('Nome completo *', 'Full name *')}</Label>
              <Input id="name" value={form.name} onChange={e => set('name', e.target.value)} required className="mt-1" placeholder={t('Ana Silva', 'Jane Smith')} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="email">{t('Email *', 'Email *')}</Label>
              <Input id="email" type="email" value={form.email} onChange={e => handleEmailChange(e.target.value)} required className={`mt-1 ${emailError ? 'border-red-500' : ''}`} placeholder="ana@empresa.pt" />
              {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
            </div>
            <div className="col-span-2">
              <Label htmlFor="company">{t('Empresa *', 'Company *')}</Label>
              <Input id="company" value={form.company} onChange={e => set('company', e.target.value)} required className="mt-1" placeholder={t('Nome da empresa', 'Company name')} />
            </div>
            <div>
              <Label htmlFor="role">{t('Cargo *', 'Job title *')}</Label>
              <Input id="role" value={form.role} onChange={e => set('role', e.target.value)} required className="mt-1" placeholder="CEO, CTO..." />
            </div>
            <div>
              <Label>{t('Setor', 'Sector')}</Label>
              <Select value={form.sector} onValueChange={v => set('sector', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t('Selecionar', 'Select')} /></SelectTrigger>
                <SelectContent>
                  {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('Dimensão da empresa', 'Company size')}</Label>
              <Select value={form.company_size} onValueChange={v => set('company_size', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t('Selecionar', 'Select')} /></SelectTrigger>
                <SelectContent>
                  {SIZES.map(s => <SelectItem key={s} value={s}>{s} {t('colaboradores', 'employees')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('Idioma da avaliação', 'Assessment language')}</Label>
              <Select value={form.language} onValueChange={v => { set('language', v); setLang(v); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">🇵🇹 Português</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full gap-2 bg-blue-500 hover:bg-blue-600 text-white" size="lg" disabled={loading || !form.name || !form.email || !form.company || !form.role}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {t('Iniciar Avaliação', 'Start Assessment')}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t('Os seus dados são tratados de acordo com o RGPD.', 'Your data is processed in accordance with GDPR.')}
          </p>
        </form>
      </div>
    </div>
  );
}