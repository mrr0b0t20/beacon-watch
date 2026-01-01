import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Plan, AlertChannel } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  Mail, 
  Send, 
  Smartphone,
  Lock,
  Zap,
  Check,
  Moon,
  Sun,
  Trash2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const integrations: { channel: AlertChannel; icon: any; name: string; description: string }[] = [
  { channel: 'discord', icon: MessageSquare, name: 'Discord', description: 'Receive alerts via Discord webhook' },
  { channel: 'email', icon: Mail, name: 'Email', description: 'Get notified via email' },
  { channel: 'slack', icon: Send, name: 'Slack', description: 'Post alerts to Slack channels' },
  { channel: 'telegram', icon: Send, name: 'Telegram', description: 'Receive alerts in Telegram' },
  { channel: 'sms', icon: Smartphone, name: 'SMS', description: 'Critical alerts via SMS (credits required)' },
];

const plans: { id: Plan; name: string; price: string; features: string[] }[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    features: ['1 monitor', '10-min intervals', 'Discord alerts', '7 days retention'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$9/mo',
    features: ['10 monitors', '1-min intervals', '4 alert channels', '30 days retention'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$29/mo',
    features: ['50 monitors', '30-sec intervals', 'All channels + SMS', 'API access'],
  },
];

export default function Settings() {
  const { user, profile, planLimits, updatePlan, deleteAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const isChannelAvailable = (channel: AlertChannel) => {
    return planLimits?.channels.includes(channel) || false;
  };

  const handleSaveWebhook = async () => {
    if (!user || !discordWebhook) return;

    const { error } = await supabase
      .from('integrations')
      .update({ discord_webhook: discordWebhook })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to save webhook');
    } else {
      toast.success('Discord webhook saved');
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    const { error } = await deleteAccount();
    
    if (error) {
      toast.error('Failed to delete account');
      setIsDeletingAccount(false);
    } else {
      toast.success('Account deleted');
      navigate('/auth');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-10">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>

          {/* Appearance Section */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Appearance</h2>
            <Card className="card-gradient border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {theme === 'dark' ? (
                        <Moon className="h-5 w-5 text-primary" />
                      ) : (
                        <Sun className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Theme</h3>
                      <p className="text-sm text-muted-foreground">
                        Currently using {theme} mode
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Plan Selection */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Your Plan</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isCurrentPlan = profile?.plan === plan.id;
                return (
                  <Card 
                    key={plan.id}
                    className={cn(
                      'card-gradient border-border/50 transition-all cursor-pointer',
                      isCurrentPlan && 'border-primary ring-1 ring-primary'
                    )}
                    onClick={() => updatePlan(plan.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {isCurrentPlan && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-2xl font-bold text-foreground">{plan.price}</div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Integrations */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Alert Integrations</h2>
            <div className="space-y-4">
              {integrations.map((integration) => {
                const isAvailable = isChannelAvailable(integration.channel);
                const Icon = integration.icon;
                
                return (
                  <Card 
                    key={integration.channel}
                    className={cn(
                      'card-gradient border-border/50',
                      !isAvailable && 'opacity-60'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'h-10 w-10 rounded-lg flex items-center justify-center',
                            isAvailable ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-foreground">{integration.name}</h3>
                              {!isAvailable && (
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{integration.description}</p>
                          </div>
                        </div>
                        
                        {isAvailable ? (
                          integration.channel === 'discord' ? (
                            <div className="flex items-center gap-3">
                              <Input
                                placeholder="Discord webhook URL"
                                value={discordWebhook}
                                onChange={(e) => setDiscordWebhook(e.target.value)}
                                className="w-64 bg-background border-border"
                              />
                              <Button variant="secondary" onClick={handleSaveWebhook}>
                                Save
                              </Button>
                            </div>
                          ) : (
                            <Switch />
                          )
                        ) : (
                          <Button variant="outline" size="sm">
                            <Zap className="h-4 w-4 mr-1" />
                            Upgrade
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <h2 className="text-lg font-semibold text-destructive mb-4">Danger Zone</h2>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Delete Account</h3>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all data
                      </p>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove all your data including monitors, alerts, and
                          settings from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={isDeletingAccount}
                        >
                          {isDeletingAccount ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete Account'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
