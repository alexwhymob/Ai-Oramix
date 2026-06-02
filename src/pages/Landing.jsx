import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, QrCode, ArrowRight, BarChart3, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/useLanguage';

export default function Landing() {
  const { lang } = useLanguage();
  const [qrOpen, setQrOpen] = useState(false);
  const [token, setToken] = useState('');

  const features = [
  { icon: <BarChart3 className="w-5 h-5" />, pt: ['6 Pilares de Avaliação', 'Dados, Tecnologia, Processos, Pessoas, Segurança e Estratégia'], en: ['6 Assessment Pillars', 'Data, Technology, Processes, People, Security and Strategy'] },
  { icon: <FileText className="w-5 h-5" />, pt: ['Relatório Personalizado', 'Relatório detalhado com recomendações e roadmap gerados por IA'], en: ['Personalised Report', 'Detailed report with AI-generated recommendations and roadmap'] },
  { icon: <Shield className="w-5 h-5" />, pt: ['Conformidade & Segurança', 'Avaliação inclui RGPD, AI Act europeu e NIS2'], en: ['Compliance & Security', 'Assessment covers GDPR, EU AI Act and NIS2'] }];


  const t = (pt, en) => lang === 'pt' ? pt : en;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] via-[#122034] to-[#0D1B2A] text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 bg-[hsl(var(--primary))]">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white">Oramix</span>
            <span className="text-white/40 text-sm ml-2 hidden sm:inline">AI Readiness</span>
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
          {t('Powered by Oramix · IA para Empresas', 'Powered by Oramix · AI for Business')}
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6 tracking-tight">
          {t(
            <><span className="text-white">A sua organização está</span><br /><span className="text-blue-400">pronta para a IA!?</span></>,
            <><span className="text-white">Is your organisation</span><br /><span className="text-blue-400">ready for AI?</span></>
          )}
        </h1>

        <p className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          {t(
            'Avalie a maturidade da sua organização em 6 pilares críticos e receba um plano de ação personalizado para a sua jornada de Inteligência Artificial.',
            'Evaluate your organisation\'s maturity across 6 critical pillars and receive a personalised action plan for your AI journey.'
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <Link to="/register" className="flex-1">
            <Button className="w-full hover:bg-blue-600 text-white py-6 text-base font-semibold rounded-xl gap-2 shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/40 bg-[hsl(var(--primary))]" size="lg">
              {t('Iniciar Avaliação', 'Start Assessment')}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {features.map((f, i) =>
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
              <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center text-blue-400 mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold mb-2 text-white">{lang === 'pt' ? f.pt[0] : f.en[0]}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{lang === 'pt' ? f.pt[1] : f.en[1]}</p>
            </div>
          )}
        </div>
      </div>

      <div className="text-center pb-8 text-white/25 text-xs border-t border-white/10 pt-6 space-y-2">
        <div>© 2026 Oramix · {t('Todos os direitos reservados', 'All rights reserved')}</div>
        <div>
          <a href="http://www.oramix.pt/politica-privacidade/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors">
            {t('Política de Privacidade', 'Privacy Policy')}
          </a>
        </div>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('Aceder com QR Code', 'Access with QR Code')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('Introduza o token do seu QR code para aceder diretamente ao questionário.', 'Enter your QR code token to access the questionnaire directly.')}
          </p>
          <Input
            placeholder="Token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => {if (e.key === 'Enter' && token.trim()) window.location.href = `/quiz/${token.trim()}`;}} />
          
          <Button
            className="w-full"
            disabled={!token.trim()}
            onClick={() => {if (token.trim()) window.location.href = `/quiz/${token.trim()}`;}}>
            
            {t('Continuar', 'Continue')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>);

}