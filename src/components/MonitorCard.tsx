import { Monitor } from '@/lib/types';
import { StatusIndicator, StatusBadge } from './StatusIndicator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Pause, 
  Play, 
  Trash2, 
  ExternalLink,
  Clock,
  Globe,
  Activity,
  Pencil
} from 'lucide-react';
import { useMonitors } from '@/contexts/MonitorContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonitorCardProps {
  monitor: Monitor;
  onClick?: () => void;
  onEdit?: (monitor: Monitor) => void;
}

export function MonitorCard({ monitor, onClick, onEdit }: MonitorCardProps) {
  const { pauseMonitor, resumeMonitor, deleteMonitor } = useMonitors();

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${seconds / 60}m`;
    return `${seconds / 3600}h`;
  };

  const getRegionDisplay = () => {
    if (monitor.region_mode === 'nearest') return '1 region';
    if (monitor.region_mode === 'multi') return '3 regions';
    return 'All regions';
  };

  return (
    <Card 
      className={cn(
        'card-gradient border-border/50 hover:border-border transition-all duration-200 cursor-pointer group',
        monitor.status === 'down' && 'border-destructive/30 hover:border-destructive/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <StatusIndicator status={monitor.status} size="lg" className="mt-1" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">
                  {monitor.name}
                </h3>
                <StatusBadge status={monitor.status} />
              </div>
              <a
                href={monitor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 truncate mt-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                {monitor.url}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEdit?.(monitor);
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {monitor.status === 'paused' ? (
                <DropdownMenuItem onClick={() => resumeMonitor(monitor.id)}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => pauseMonitor(monitor.id)}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => deleteMonitor(monitor.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatInterval(monitor.interval_sec)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            <span>{getRegionDisplay()}</span>
          </div>
          {monitor.status !== 'paused' && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              <span>{monitor.avg_response_ms}ms</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="text-sm">
            <span className="text-muted-foreground">Uptime: </span>
            <span className={cn(
              'font-medium',
              monitor.uptime_percentage >= 99.9 ? 'text-success' :
              monitor.uptime_percentage >= 99 ? 'text-warning' : 'text-destructive'
            )}>
              {monitor.uptime_percentage.toFixed(2)}%
            </span>
          </div>
          {monitor.last_checked && (
            <span className="text-xs text-muted-foreground">
              Checked {formatDistanceToNow(new Date(monitor.last_checked), { addSuffix: true })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
