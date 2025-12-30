import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const mockAlerts = [
  {
    id: '1',
    monitor_name: 'Staging Server',
    type: 'down',
    message: 'Monitor is down. HTTP 500 returned.',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    channel: 'discord',
  },
  {
    id: '2',
    monitor_name: 'Production API',
    type: 'up',
    message: 'Monitor is back up after 3 minutes downtime.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    channel: 'discord',
  },
  {
    id: '3',
    monitor_name: 'Web Application',
    type: 'down',
    message: 'Monitor is down. Connection timeout.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    channel: 'discord',
  },
];

export default function Alerts() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">Alerts</h1>
          <p className="text-muted-foreground mb-8">Recent notifications from your monitors</p>

          {mockAlerts.length === 0 ? (
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
              {mockAlerts.map((alert) => (
                <Card key={alert.id} className="card-gradient border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        alert.type === 'down' ? 'bg-destructive/10' : 'bg-success/10'
                      }`}>
                        {alert.type === 'down' ? (
                          <XCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-success" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">{alert.monitor_name}</h3>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                          via {alert.channel}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
