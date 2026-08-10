import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function buildFullEmail(bodyHtml, lang) {
  const subtitle = lang === 'pt' ? 'Diagnostico de Maturidade em IA' : 'AI Maturity Assessment';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#eef1f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#1d4e89 0%,#e67e22 100%);padding:32px 40px;text-align:center;">
                <div style="font-size:22px;font-weight:bold;color:#ffffff;">Oramix AI Readiness</div>
                <div style="font-size:13px;color:#ffffff;opacity:0.9;margin-top:4px;">${subtitle}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px;color:#2c3e50;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;background:#f8f9fb;text-align:center;border-top:1px solid #eef1f5;">
                <div style="font-size:12px;color:#7f8c8d;">&copy; 2026 Oramix &middot; oramix.pt</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export default function EmailPreviewDialog({ open, onClose, bodyHtml, lang }) {
  const fullHtml = bodyHtml ? buildFullEmail(bodyHtml, lang) : '';

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-5 py-3 border-b">
          <DialogTitle className="text-sm">Preview HTML - {lang === 'pt' ? 'Portugues' : 'English'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <iframe
            srcDoc={fullHtml}
            title="Email Preview"
            className="w-full bg-white rounded-lg shadow-sm"
            style={{ minHeight: '500px', border: 'none' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
