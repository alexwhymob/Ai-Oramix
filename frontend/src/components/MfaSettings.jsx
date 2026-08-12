import { useEffect, useState } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export default function MfaSettings() {
  const { user, checkUserAuth } = useAuth();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    try {
      const nextSetup = await base44.auth.setupMfa();
      setSetup(nextSetup);
      setQrCode(await QRCode.toDataURL(nextSetup.otpauth_url, { width: 220, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } }));
      setRecoveryCodes([]);
    } catch (error) {
      toast.error(error.message || 'Unable to start MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const confirmSetup = async () => {
    setLoading(true);
    try {
      const result = await base44.auth.confirmMfa(setup.secret, code);
      setRecoveryCodes(result.recovery_codes || []);
      setSetup(null);
      setCode('');
      await checkUserAuth();
      toast.success('MFA enabled');
    } catch (error) {
      toast.error(error.message || 'Invalid MFA code');
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    if (!window.confirm('Disable MFA for your administrator account?')) return;
    setLoading(true);
    try {
      await base44.auth.disableMfa();
      await checkUserAuth();
      toast.success('MFA disabled');
    } catch (error) {
      toast.error(error.message || 'Unable to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#152233] border border-white/10 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-400" /> Multi-factor authentication</h2>
      <p className="text-xs text-white/50">Protect administrator access with a code from an authenticator app.</p>
      {user?.mfa_enabled ? (
        <Button size="sm" variant="outline" onClick={disable} disabled={loading} className="border-red-500/30 text-red-300">Disable MFA</Button>
      ) : !setup ? (
        <Button size="sm" onClick={startSetup} disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white gap-2">{loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}<KeyRound className="w-3.5 h-3.5" /> Set up MFA</Button>
      ) : (
        <div className="space-y-3 max-w-xl">
          <p className="text-xs text-white/70">Scan this QR Code with your authenticator app:</p>
          <div className="w-fit rounded-lg bg-white p-2"><img src={qrCode} alt="MFA setup QR Code" className="w-52 h-52" /></div>
          <details className="text-xs text-white/50"><summary className="cursor-pointer hover:text-white/80">Cannot scan? Show manual setup code</summary><code className="mt-2 block text-[11px] text-blue-200 bg-black/20 rounded p-3 break-all">{setup.secret}</code></details>
          <div className="flex gap-2"><Input inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="bg-[#0D1B2A] border-white/10 text-white max-w-40" /><Button size="sm" onClick={confirmSetup} disabled={loading || code.length !== 6} className="bg-green-600 hover:bg-green-700 text-white">Confirm</Button></div>
        </div>
      )}
      {recoveryCodes.length > 0 && <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3"><p className="text-xs text-yellow-200 mb-2">Save these recovery codes. They are shown only once.</p><code className="text-xs text-yellow-100 break-words">{recoveryCodes.join('  ')}</code></div>}
    </div>
  );
}
