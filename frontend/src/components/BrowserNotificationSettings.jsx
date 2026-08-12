import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { enableBrowserNotifications, getBrowserNotificationState, disableBrowserNotifications } from '@/api/notificationsClient';
import { toast } from 'sonner';

export default function BrowserNotificationSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBrowserNotificationState().then(setEnabled).catch(() => undefined);
  }, []);

  const toggle = async () => {
    setLoading(true);
    try {
      if (enabled) {
        await disableBrowserNotifications();
        setEnabled(false);
        toast.success('Browser notifications disabled');
      } else {
        await enableBrowserNotifications();
        setEnabled(true);
        toast.success('Browser notifications enabled');
      }
    } catch (error) {
      toast.error(error.message || 'Unable to update browser notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#152233] border border-white/10 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Bell className="w-4 h-4 text-blue-400" /> Browser notifications</h2>
      <p className="text-xs text-white/50">Receive an alert when an assessment is submitted, even when this page is closed.</p>
      <Button size="sm" onClick={toggle} disabled={loading} variant={enabled ? 'outline' : 'default'} className={enabled ? 'border-green-500/30 text-green-300' : 'bg-blue-500 hover:bg-blue-600 text-white gap-2'}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : enabled ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
        {enabled ? 'Disable notifications' : 'Enable notifications'}
      </Button>
    </div>
  );
}
