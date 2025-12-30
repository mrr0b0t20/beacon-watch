import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMonitors } from '@/contexts/MonitorContext';
import { UptimeChart } from '@/components/UptimeChart';
import { BarChart3, Download, Lock } from 'lucide-react';

export default function Reports() {
  const { planLimits } = useAuth();
  const { monitors, getCheckResults } = useMonitors();
  const hasApiAccess = planLimits?.api_access || false;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reports</h1>
              <p className="text-muted-foreground mt-1">
                Uptime analytics and exportable reports
              </p>
            </div>
            <Button 
              variant={hasApiAccess ? 'secondary' : 'outline'}
              disabled={!hasApiAccess}
            >
              {hasApiAccess ? (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Premium Only
                </>
              )}
            </Button>
          </div>

          <div className="space-y-6">
            {monitors.filter(m => m.status !== 'paused').map((monitor) => {
              const results = getCheckResults(monitor.id);
              const upCount = results.filter(r => r.status === 'up').length;
              const uptimePercent = results.length > 0 ? (upCount / results.length) * 100 : 100;

              return (
                <Card key={monitor.id} className="card-gradient border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">{monitor.name}</CardTitle>
                      <span className="text-sm text-success font-medium">
                        {uptimePercent.toFixed(2)}% uptime
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{monitor.url}</p>
                  </CardHeader>
                  <CardContent>
                    <UptimeChart results={results} className="mt-2" />
                    <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                      <span>24 hours ago</span>
                      <span>Now</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {monitors.filter(m => m.status !== 'paused').length === 0 && (
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No active monitors</h3>
                <p className="text-muted-foreground mt-2">
                  Add monitors to see uptime reports
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
