import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Alert {
  id: string;
  monitor_id: string;
  channel: string;
  message: string | null;
  success: boolean;
  created_at: string;
  delivered_at: string | null;
  monitor?: {
    name: string;
    url: string;
  };
}

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAlerts = async () => {
      setIsLoading(true);
      
      // First get user's monitors
      const { data: monitors } = await supabase
        .from('monitors')
        .select('id, name, url')
        .eq('user_id', user.id);

      if (!monitors || monitors.length === 0) {
        setAlerts([]);
        setIsLoading(false);
        return;
      }

      const monitorIds = monitors.map(m => m.id);
      const monitorMap = new Map(monitors.map(m => [m.id, { name: m.name, url: m.url }]));

      // Then get alerts for those monitors
      const { data: alertsData, error } = await supabase
        .from('alerts')
        .select('*')
        .in('monitor_id', monitorIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching alerts:', error);
        setIsLoading(false);
        return;
      }

      // Merge monitor info into alerts
      const alertsWithMonitors = (alertsData || []).map(alert => ({
        ...alert,
        monitor: monitorMap.get(alert.monitor_id),
      }));

      setAlerts(alertsWithMonitors);
      setIsLoading(false);
    };

    fetchAlerts();

    // Set up realtime subscription for new alerts
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        async (payload) => {
          // Check if this alert belongs to user's monitors
          const { data: monitor } = await supabase
            .from('monitors')
            .select('id, name, url')
            .eq('id', payload.new.monitor_id)
            .eq('user_id', user.id)
            .single();

          if (monitor) {
            const newAlert = {
              ...payload.new as Alert,
              monitor: { name: monitor.name, url: monitor.url },
            };
            setAlerts(prev => [newAlert, ...prev].slice(0, 50));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getAlertType = (message: string | null) => {
    if (!message) return 'down';
    return message.toLowerCase().includes('back up') ? 'up' : 'down';
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">Alerts</h1>
          <p className="text-muted-foreground mb-8">Recent notifications from your monitors</p>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No alerts yet</h3>
              <p className="text-muted-foreground mt-2">
                When your monitors go down, alerts will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const alertType = getAlertType(alert.message);
                return (
                  <Card key={alert.id} className="card-gradient border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          alertType === 'down' ? 'bg-destructive/10' : 'bg-success/10'
                        }`}>
                          {alertType === 'down' ? (
                            <XCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-success" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground">
                              {alert.monitor?.name || 'Unknown Monitor'}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.message || 'Status changed'}
                          </p>
                          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                            via {alert.channel}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
