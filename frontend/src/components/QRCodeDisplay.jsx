import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QRCodeDisplay({ token, size = 200, compact = false }) {
  const quizUrl = `${window.location.origin}/quiz/${token}`;
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(quizUrl, { width: size, margin: 1 })
      .then((url) => { if (active) setQrUrl(url); })
      .catch(() => { if (active) setQrUrl(''); });
    return () => { active = false; };
  }, [quizUrl, size]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `qr_${token.slice(0, 8)}.png`;
    a.target = '_blank';
    a.click();
  };

  if (compact) return (
    qrUrl ? <img src={qrUrl} alt="QR" width={size} height={size} className="rounded-lg" /> : null
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-3 bg-white rounded-xl shadow-sm border">
        {qrUrl && <img src={qrUrl} alt="QR Code" width={size} height={size} className="rounded-lg" />}
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground break-all max-w-[240px]">{quizUrl}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={!qrUrl} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Download
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.open(quizUrl, '_blank')} className="gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </Button>
      </div>
    </div>
  );
}
