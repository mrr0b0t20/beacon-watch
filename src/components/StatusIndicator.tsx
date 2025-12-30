import { cn } from '@/lib/utils';
import { MonitorStatus } from '@/lib/types';

interface StatusIndicatorProps {
  status: MonitorStatus;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  className?: string;
}

const statusConfig = {
  up: {
    color: 'bg-success',
    ring: 'ring-success/30',
    label: 'Operational',
  },
  down: {
    color: 'bg-destructive',
    ring: 'ring-destructive/30',
    label: 'Down',
  },
  paused: {
    color: 'bg-muted-foreground',
    ring: 'ring-muted-foreground/30',
    label: 'Paused',
  },
  pending: {
    color: 'bg-warning',
    ring: 'ring-warning/30',
    label: 'Checking',
  },
};

const sizeConfig = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function StatusIndicator({
  status,
  size = 'md',
  showPulse = true,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <span
        className={cn(
          'rounded-full',
          sizeConfig[size],
          config.color
        )}
      />
      {showPulse && status === 'up' && (
        <span
          className={cn(
            'absolute rounded-full animate-pulse-ring',
            sizeConfig[size],
            config.color,
            'opacity-75'
          )}
        />
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: MonitorStatus }) {
  const config = statusConfig[status];

  return (
    <span className={cn('status-badge', `status-${status}`)}>
      <StatusIndicator status={status} size="sm" showPulse={false} />
      {config.label}
    </span>
  );
}
