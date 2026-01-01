import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MonitorCard } from '@/components/MonitorCard';
import { StatsCard } from '@/components/StatsCard';
import { AddMonitorModal } from '@/components/AddMonitorModal';
import { EditMonitorModal } from '@/components/EditMonitorModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMonitors } from '@/contexts/MonitorContext';
import { Monitor } from '@/lib/types';
import { Plus, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function Dashboard() {
  const { profile, planLimits } = useAuth();
  const { monitors } = useMonitors();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);

  const stats = {
    total: monitors.length,
    up: monitors.filter(m => m.status === 'up').length,
    down: monitors.filter(m => m.status === 'down').length,
    avgResponse: Math.round(
      monitors.filter(m => m.avg_response_ms > 0).reduce((acc, m) => acc + m.avg_response_ms, 0) /
      Math.max(monitors.filter(m => m.avg_response_ms > 0).length, 1)
    ),
  };

  const canAddMore = planLimits ? monitors.length < planLimits.max_monitors : false;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Monitors</h1>
              <p className="text-muted-foreground mt-1">
                {monitors.length} of {planLimits?.max_monitors} monitors used
              </p>
            </div>
            <Button 
              variant="glow" 
              onClick={() => setShowAddModal(true)}
              disabled={!canAddMore}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Monitor
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Total Monitors"
              value={stats.total}
              icon={<Activity className="h-5 w-5" />}
            />
            <StatsCard
              title="Operational"
              value={stats.up}
              subtitle={`${stats.total > 0 ? ((stats.up / stats.total) * 100).toFixed(0) : 0}%`}
              icon={<CheckCircle className="h-5 w-5" />}
            />
            <StatsCard
              title="Down"
              value={stats.down}
              icon={<XCircle className="h-5 w-5" />}
            />
            <StatsCard
              title="Avg Response"
              value={`${stats.avgResponse}ms`}
              icon={<Clock className="h-5 w-5" />}
            />
          </div>

          {/* Monitor List */}
          {monitors.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No monitors yet</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                Add your first monitor to start tracking uptime for your websites and APIs
              </p>
              <Button 
                variant="glow" 
                className="mt-6"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Monitor
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {monitors.map((monitor, index) => (
                <div
                  key={monitor.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <MonitorCard 
                    monitor={monitor} 
                    onEdit={(m) => setEditingMonitor(m)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Plan limit warning */}
          {!canAddMore && monitors.length > 0 && (
            <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning">
                You've reached the monitor limit for your {profile?.plan} plan.{' '}
                <button className="underline font-medium hover:no-underline">
                  Upgrade to add more
                </button>
              </p>
            </div>
          )}
        </div>
      </main>

      <AddMonitorModal open={showAddModal} onOpenChange={setShowAddModal} />
      <EditMonitorModal 
        open={!!editingMonitor} 
        onOpenChange={(open) => !open && setEditingMonitor(null)}
        monitor={editingMonitor}
      />
    </div>
  );
}
