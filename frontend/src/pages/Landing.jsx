import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BarChart3, Brain, FileText, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/useLanguage';
import { base44 } from '@/api/base44Client';

export default function Landing() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = (pt, en) => (lang === 'pt' ? pt : en);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['assessment-templates'],
    queryFn: () => base44.entities.AssessmentTemplate.filter({ active: true }, 'order', 20)
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] via-[#122034] to-[#0D1B2A] text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 bg-[hsl(var(--primary))]">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white">Oramix</span>
            <span className="text-white/40 text-sm ml-2 hidden sm:inline">Assessment Platform</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle dark />
          <Link to="/admin" className="text-white/40 hover:text-white text-sm transition-colors hidden sm:block">
            Admin
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8 text-blue-400 text-sm font-medium">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          {t('Powered by Oramix - IA para Empresas', 'Powered by Oramix - AI for Business')}
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6 tracking-tight">
          {t(
            <><span className="text-white">Avalie a maturidade</span><br /><span className="text-blue-400">da sua organizacao</span></>,
            <><span className="text-white">Assess your organization</span><br /><span className="text-blue-400">with the right template</span></>
          )}
        </h1>

        <p className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-6 leading-relaxed">
          {t(
            'Escolha uma das avaliacoes disponiveis e receba um relatorio personalizado com recomendacoes e roadmap para a sua jornada de Inteligencia Artificial.',
            'Choose one of the available assessments and receive a personalized report with recommendations and roadmap for your AI journey.'
          )}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-20">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : templates.length === 0 ? (
          <FallbackAssessmentCard lang={lang} onStart={() => navigate('/register')} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                lang={lang}
                onStart={() => navigate(`/register?templateId=${template.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="text-center pb-8 text-white/25 text-xs border-t border-white/10 pt-6 space-y-2">
        <div>&copy; 2026 Oramix - {t('Todos os direitos reservados', 'All rights reserved')}</div>
        <div>
          <a
            href="http://www.oramix.pt/politica-privacidade/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors"
          >
            {t('Politica de Privacidade', 'Privacy Policy')}
          </a>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, lang, onStart }) {
  const t = (pt, en) => (lang === 'pt' ? pt : en);
  const name = lang === 'pt' ? template.name_pt : (template.name_en || template.name_pt);
  const tagline = lang === 'pt' ? template.tagline_pt : (template.tagline_en || template.tagline_pt);
  const pitch = lang === 'pt' ? template.pitch_pt : (template.pitch_en || template.pitch_pt);
  const security = lang === 'pt'
    ? template.report_security_pt
    : (template.report_security_en || template.report_security_pt);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/25 hover:bg-white/8 transition-all duration-200 flex flex-col">
      <div className="flex-1">
        <h2 className="text-xl font-bold text-white mb-2">{name}</h2>
        {tagline && <p className="text-blue-400 text-sm font-medium mb-4">{tagline}</p>}
        {pitch && <p className="text-white/60 text-sm leading-relaxed mb-6">{pitch}</p>}

        <div className="space-y-3 mb-6">
          {template.pillar_count > 0 && (
            <div className="flex items-center gap-3 text-sm text-white/60">
              <div className="w-7 h-7 bg-blue-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-blue-400" />
              </div>
              <span>
                <span className="text-white font-medium">{template.pillar_count}</span>{' '}
                {t('pilares de avaliacao', 'assessment pillars')}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-white/60">
            <div className="w-7 h-7 bg-blue-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <span>{t('Relatorio personalizado gerado por IA', 'Personalized AI-generated report')}</span>
          </div>
          {security && (
            <div className="flex items-center gap-3 text-sm text-white/60">
              <div className="w-7 h-7 bg-blue-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <span>{security}</span>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={onStart}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold gap-2 rounded-xl"
        size="lg"
      >
        {t('Iniciar Avaliacao', 'Start Assessment')}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function FallbackAssessmentCard({ lang, onStart }) {
  const t = (pt, en) => (lang === 'pt' ? pt : en);
  const features = [
    {
      icon: <BarChart3 className="w-4 h-4 text-blue-400" />,
      pt: '6 pilares de avaliacao',
      en: '6 assessment pillars'
    },
    {
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      pt: 'Relatorio personalizado gerado por IA',
      en: 'Personalized AI-generated report'
    },
    {
      icon: <Shield className="w-4 h-4 text-blue-400" />,
      pt: 'Conformidade: RGPD, AI Act europeu e NIS2',
      en: 'Compliance: GDPR, EU AI Act and NIS2'
    }
  ];

  return (
    <div className="max-w-xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col">
      <h2 className="text-xl font-bold text-white mb-2">
        {t('AI Readiness Assessment', 'AI Readiness Assessment')}
      </h2>
      <p className="text-white/60 text-sm leading-relaxed mb-6">
        {t(
          'Avalie a maturidade da sua organizacao em 6 pilares criticos e receba um plano de acao personalizado para a sua jornada de IA.',
          'Evaluate your organization across 6 critical pillars and receive a personalized action plan for your AI journey.'
        )}
      </p>
      <div className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3 text-sm text-white/60">
            <div className="w-7 h-7 bg-blue-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
              {feature.icon}
            </div>
            <span>{lang === 'pt' ? feature.pt : feature.en}</span>
          </div>
        ))}
      </div>
      <Button
        onClick={onStart}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold gap-2 rounded-xl"
        size="lg"
      >
        {t('Iniciar Avaliacao', 'Start Assessment')}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
