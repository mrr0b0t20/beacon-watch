import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useMonitors } from '@/contexts/MonitorContext';
import { INTERVAL_OPTIONS, MonitorType, Plan } from '@/lib/types';
import { Lock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddMonitorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMonitorModal({ open, onOpenChange }: AddMonitorModalProps) {
  const { user, planLimits } = useAuth();
  const { addMonitor, isLoading } = useMonitors();
  
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [monitorType, setMonitorType] = useState<MonitorType>('http');
  const [interval, setInterval] = useState(planLimits?.min_interval_sec || 600);
  const [keyword, setKeyword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await addMonitor({
      url: url.startsWith('http') ? url : `https://${url}`,
      name: name || new URL(url.startsWith('http') ? url : `https://${url}`).hostname,
      monitor_type: monitorType,
      interval_sec: interval,
      region_mode: planLimits?.region_mode || 'nearest',
      keyword: monitorType === 'keyword' ? keyword : undefined,
      expected_status: 200,
    });

    if (success) {
      setUrl('');
      setName('');
      setKeyword('');
      onOpenChange(false);
    }
  };

  const isIntervalLocked = (optionPlan: Plan) => {
    if (!user) return true;
    const planOrder: Plan[] = ['free', 'starter', 'premium'];
    return planOrder.indexOf(optionPlan) > planOrder.indexOf(user.plan);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] card-gradient border-border">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Monitor</DialogTitle>
          <DialogDescription>
            Create a new uptime monitor for your website or API
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL to Monitor</Label>
            <Input
              id="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-background border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display Name (optional)</Label>
            <Input
              id="name"
              placeholder="Production API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check Type</Label>
              <Select value={monitorType} onValueChange={(v) => setMonitorType(v as MonitorType)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP(s)</SelectItem>
                  <SelectItem value="keyword">Keyword</SelectItem>
                  <SelectItem value="port">Port</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Check Interval</Label>
              <Select value={String(interval)} onValueChange={(v) => setInterval(Number(v))}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((option) => {
                    const locked = isIntervalLocked(option.plan);
                    return (
                      <SelectItem 
                        key={option.value} 
                        value={String(option.value)}
                        disabled={locked}
                        className={cn(locked && 'opacity-50')}
                      >
                        <span className="flex items-center gap-2">
                          {option.label}
                          {locked && <Lock className="h-3 w-3" />}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {monitorType === 'keyword' && (
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword to Check</Label>
              <Input
                id="keyword"
                placeholder="Welcome"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-background border-border"
                required
              />
              <p className="text-xs text-muted-foreground">
                Page will be marked as down if this keyword is not found
              </p>
            </div>
          )}

          {planLimits && (
            <div className="rounded-lg bg-secondary/50 p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" />
                <span>Your plan: <span className="text-foreground capitalize">{user?.plan}</span></span>
              </div>
              <ul className="mt-2 space-y-1 text-muted-foreground text-xs">
                <li>• Check from {planLimits.region_mode === 'nearest' ? '1 region' : planLimits.region_mode === 'multi' ? '3 regions' : 'all regions'}</li>
                <li>• Minimum interval: {planLimits.min_interval_sec >= 60 ? `${planLimits.min_interval_sec / 60} minute(s)` : `${planLimits.min_interval_sec} seconds`}</li>
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="glow"
              className="flex-1"
              disabled={isLoading || !url}
            >
              {isLoading ? 'Creating...' : 'Create Monitor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
