import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/useLanguage';
import { base44 } from '@/api/base44Client';
import { isCorporateEmail } from '@/lib/blockedEmailDomains';

const SECTORS = ['Tecnologia', 'Saude', 'Industria', 'Retalho', 'Servicos Financeiros', 'Educacao', 'Energia', 'Logistica', 'Construcao', 'Outro'];
const SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

/**
 * @typedef {Object} CustomerRegisterForm
 * @property {string} name
 * @property {string} email
 * @property {string} company
 * @property {string} role
 * @property {string} sector
 * @property {string} company_size
 * @property {'pt' | 'en'} language
 */

export default function CustomerRegister() {
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const templateId = urlParams.get('templateId') || null;

  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [dataConsent, setDataConsent] = useState(false);
  const [consentError, setConsentError] = useState('');
  /** @type {[CustomerRegisterForm, import('react').Dispatch<import('react').SetStateAction<CustomerRegisterForm>>]} */
  const [form, setForm] = useState(
    /** @type {CustomerRegisterForm} */ ({
      name: '',
      email: '',
      company: '',
      role: '',
      sector: '',
      company_size: '',
      language: lang === 'en' ? 'en' : 'pt'
    })
  );

  const { data: template, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['assessment-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const results = await base44.entities.AssessmentTemplate.filter({ id: templateId });
      const resolvedTemplate = results[0] || null;
      if (!resolvedTemplate) return null;
      if ((resolvedTemplate.template_type || 'assessment') !== 'assessment') {
        return null;
      }
      return resolvedTemplate;
    },
    enabled: !!templateId
  });

  /** @param {string} pt @param {string} en */
  const t = (pt, en) => (lang === 'pt' ? pt : en);
  /** @param {keyof CustomerRegisterForm} key @param {string} value */
  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  useEffect(() => {
    setField('language', lang === 'en' ? 'en' : 'pt');
  }, [lang]);

  useEffect(() => {
    if (!templateId || isLoadingTemplate) return;
    if (template === null) {
      navigate('/', { replace: true });
    }
  }, [templateId, isLoadingTemplate, template, navigate]);

  /** @param {string} value */
  const handleEmailChange = (value) => {
    setField('email', value);
    if (value && !isCorporateEmail(value)) {
      setEmailError(t('Por favor use o seu email corporativo.', 'Please use your corporate email address.'));
      return;
    }
    setEmailError('');
  };

  /** @param {import('react').FormEvent<HTMLFormElement>} event */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isCorporateEmail(form.email)) {
      setEmailError(t('Por favor use o seu email corporativo.', 'Please use your corporate email address.'));
      return;
    }

    if (!dataConsent) {
      setConsentError(t('Tem de autorizar o tratamento de dados para iniciar a avaliacao.', 'You must authorize data processing to start the assessment.'));
      return;
    }

    if (!form.company_size) {
      setEmailError(t('Selecione a dimensao da empresa para iniciar a avaliacao.', 'Select the company size to start the assessment.'));
      return;
    }

    setConsentError('');
    setLoading(true);

    try {
      if (templateId && !template) {
        navigate('/', { replace: true });
        return;
      }

      const response = await base44.functions.invoke('quizSession', {
        action: 'registerCustomer',
        templateId,
        form: {
          ...form,
          data_consent: true,
          data_consent_at: new Date().toISOString()
        }
      });

      if (response.data?.error) {
        if (response.data.error === 'data_consent_required') {
          setConsentError(t('Tem de autorizar o tratamento de dados para iniciar a avaliacao.', 'You must authorize data processing to start the assessment.'));
        } else {
          setEmailError(t('Email corporativo obrigatorio. Dominios pessoais nao sao aceites.', 'Corporate email required. Personal email domains are not accepted.'));
        }
        return;
      }

      if (!response.data?.accessToken) {
        setEmailError(t('Nao foi possivel iniciar a avaliacao. Tente novamente.', 'Could not start the assessment. Please try again.'));
        return;
      }

      navigate(`/quiz#access=${encodeURIComponent(response.data.accessToken)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setEmailError(message || t('Ocorreu um erro ao iniciar a avaliacao. Tente novamente.', 'An error occurred while starting the assessment. Please try again.'));
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {template
              ? (lang === 'pt' ? template.name_pt : (template.name_en || template.name_pt))
              : t('Registar Avaliacao', 'Register for Assessment')}
          </h1>
          <p className="text-muted-foreground">
            {template
              ? ((lang === 'pt' ? template.pitch_pt : (template.pitch_en || template.pitch_pt))
                || t('Preencha os seus dados para iniciar a avaliacao.', 'Fill in your details to start the assessment.'))
              : t('Preencha os seus dados para iniciar a avaliacao de maturidade em IA.', 'Fill in your details to start the AI readiness assessment.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">{t('Nome completo *', 'Full name *')}</Label>
              <Input id="name" value={form.name} onChange={(event) => setField('name', event.target.value)} required className="mt-1" placeholder={t('Ana Silva', 'Jane Smith')} />
            </div>

            <div className="col-span-2">
              <Label htmlFor="email">{t('Email *', 'Email *')}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => handleEmailChange(event.target.value)}
                required
                className={`mt-1 ${emailError ? 'border-red-500' : ''}`}
                placeholder="ana@empresa.pt"
              />
              {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
            </div>

            <div className="col-span-2">
              <Label htmlFor="company">{t('Empresa *', 'Company *')}</Label>
              <Input id="company" value={form.company} onChange={(event) => setField('company', event.target.value)} required className="mt-1" placeholder={t('Nome da empresa', 'Company name')} />
            </div>

            <div>
              <Label htmlFor="role">{t('Cargo *', 'Job title *')}</Label>
              <Input id="role" value={form.role} onChange={(event) => setField('role', event.target.value)} required className="mt-1" placeholder="CEO, CTO..." />
            </div>

            <div>
              <Label>{t('Setor', 'Sector')}</Label>
              <Select value={form.sector} onValueChange={(value) => setField('sector', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('Selecionar', 'Select')} />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('Dimensao da empresa *', 'Company size *')}</Label>
              <Select value={form.company_size} onValueChange={(value) => setField('company_size', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('Selecionar', 'Select')} />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size} {t('colaboradores', 'employees')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('Idioma da avaliacao', 'Assessment language')}</Label>
              <Select
                value={form.language}
                onValueChange={(value) => {
                  const nextLang = value === 'en' ? 'en' : 'pt';
                  setField('language', nextLang);
                  setLang(nextLang);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">PT Portugues</SelectItem>
                  <SelectItem value="en">EN English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{t('Tratamento de dados', 'Data Processing')}</p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dataConsent}
                onChange={(event) => {
                  setDataConsent(event.target.checked);
                  if (event.target.checked) setConsentError('');
                }}
                className="mt-0.5 w-4 h-4 accent-blue-500 flex-shrink-0"
              />
              <span className="text-sm text-muted-foreground leading-snug">
                {lang === 'pt' ? (
                  <>
                    Declaro que li e autorizo o tratamento de dados pessoais de acordo com a{' '}
                    <a href="http://www.oramix.pt/politica-privacidade/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline">
                      Politica de Privacidade
                    </a>{' '}
                    para fins comerciais.
                  </>
                ) : (
                  <>
                    I declare that I have read and authorize the processing of personal data in accordance with the{' '}
                    <a href="http://www.oramix.pt/politica-privacidade/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline">
                      Privacy Policy
                    </a>{' '}
                    for commercial purposes.
                  </>
                )}
              </span>
            </label>
            {consentError && <p className="text-xs text-red-500">{consentError}</p>}
          </div>

          <Button type="submit" className="w-full gap-2 bg-blue-500 hover:bg-blue-600 text-white" size="lg" disabled={loading || !form.name || !form.email || !form.company || !form.role || !form.company_size || !dataConsent}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {t('Iniciar Avaliacao', 'Start Assessment')}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t('Os seus dados sao tratados de acordo com o RGPD.', 'Your data is processed in accordance with GDPR.')}
          </p>
        </form>
      </div>
    </div>
  );
}
