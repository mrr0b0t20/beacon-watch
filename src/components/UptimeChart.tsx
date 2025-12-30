import { CheckResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UptimeChartProps {
  results: CheckResult[];
  className?: string;
}

export function UptimeChart({ results, className }: UptimeChartProps) {
  // Group results into buckets for display
  const bucketCount = 90;
  const bucketSize = Math.ceil(results.length / bucketCount);
  
  const buckets = [];
  for (let i = 0; i < bucketCount; i++) {
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, results.length);
    const slice = results.slice(start, end);
    
    if (slice.length === 0) continue;
    
    const upCount = slice.filter(r => r.status === 'up').length;
    const percentage = (upCount / slice.length) * 100;
    
    buckets.push({
      percentage,
      timestamp: slice[0]?.timestamp,
    });
  }

  const getColor = (percentage: number) => {
    if (percentage >= 99) return 'bg-success';
    if (percentage >= 90) return 'bg-warning';
    if (percentage > 0) return 'bg-destructive';
    return 'bg-muted';
  };

  return (
    <div className={cn('flex gap-0.5 h-8', className)}>
      {buckets.map((bucket, i) => (
        <div
          key={i}
          className={cn(
            'flex-1 rounded-sm transition-all hover:opacity-80',
            getColor(bucket.percentage)
          )}
          title={`${bucket.percentage.toFixed(1)}% uptime`}
        />
      ))}
    </div>
  );
}
