import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Brain,
  FileText,
  Loader2,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/useLanguage';
import { base44 } from '@/api/base44Client';

export default function AssessmentLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = (pt, en) => (lang === 'pt' ? pt : en);

  const { data: template, isLoading, isError } = useQuery({
    queryKey: ['assessment-template-by-slug', slug],
    queryFn: async () => {
      const results = await base44.entities.AssessmentTemplate.filter({
        code: slug,
        active: true
      });

      if (!results.length) {
        throw new Error('not_found');
      }

      const template = results[0];
      if ((template.template_type || 'assessment') !== 'assessment') {
        throw new Error('not_found');
      }

      return template;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] via-[#122034] to-[#0D1B2A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (isError || !template) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] via-[#122034] to-[#0D1B2A] flex items-center justify-center text-white">
        <div className="text-center space-y-4 px-6">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto" />
          <h1 className="text-2xl font-bold">{t('Avaliacao nao encontrada', 'Assessment not found')}</h1>
          <p className="text-white/50">
            {t(
              'Este link de avaliacao nao existe ou esta inativo.',
              'This assessment link does not exist or is inactive.'
            )}
          </p>
          <Link to="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
            <ArrowLeft className="w-4 h-4" />
            {t('Ver todas as avaliacoes', 'View all assessments')}
          </Link>
        </div>
      </div>
    );
  }

  const name = lang === 'pt' ? template.name_pt : (template.name_en || template.name_pt);
  const tagline = lang === 'pt' ? template.tagline_pt : (template.tagline_en || template.tagline_pt);
  const description = lang === 'pt' ? template.description_pt : (template.description_en || template.description_pt);
  const pitch = lang === 'pt' ? template.pitch_pt : (template.pitch_en || template.pitch_pt);
  const security = lang === 'pt'
    ? template.report_security_pt
    : (template.report_security_en || template.report_security_pt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] via-[#122034] to-[#0D1B2A] text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-4xl mx-auto">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 bg-[hsl(var(--primary))]">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white">Oramix</span>
            <span className="text-white/40 text-sm ml-2 hidden sm:inline">Assessment Platform</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle dark />
          <Link to="/" className="text-white/40 hover:text-white text-sm transition-colors hidden sm:block">
            {t('Todas as avaliacoes', 'All assessments')}
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8 text-blue-400 text-sm font-medium">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          Oramix Assessment
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4 tracking-tight">{name}</h1>
        {tagline && <p className="text-blue-400 text-lg font-medium mb-6">{tagline}</p>}

        {(description || pitch) && (
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            {description || pitch}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {template.pillar_count > 0 && (
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>
                <span className="text-white font-semibold">{template.pillar_count}</span>{' '}
                {t('pilares', 'pillars')}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>{t('Relatorio IA personalizado', 'Personalized AI report')}</span>
          </div>
          {security && (
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>{security}</span>
            </div>
          )}
        </div>

        <Button
          onClick={() => navigate(`/register?templateId=${template.id}`)}
          size="lg"
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold gap-2 px-10 rounded-xl text-base"
        >
          {t('Iniciar Avaliacao', 'Start Assessment')}
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
