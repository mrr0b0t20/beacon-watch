import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Plus, Lock } from 'lucide-react';

export default function StatusPages() {
  const { user, planLimits } = useAuth();
  const canCreate = (planLimits?.status_pages || 0) > 0;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Status Pages</h1>
              <p className="text-muted-foreground mt-1">
                Public status pages for your users
              </p>
            </div>
            <Button 
              variant={canCreate ? 'glow' : 'secondary'}
              disabled={!canCreate}
            >
              {canCreate ? (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Status Page
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Upgrade to Create
                </>
              )}
            </Button>
          </div>

          {!canCreate ? (
            <Card className="card-gradient border-border/50">
              <CardContent className="py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Status Pages</h3>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Create public status pages to keep your users informed about your service health.
                  Available on Starter and Premium plans.
                </p>
                <Button variant="glow" className="mt-6">
                  Upgrade Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No status pages yet</h3>
              <p className="text-muted-foreground mt-2">
                Create your first status page to share with your users
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
