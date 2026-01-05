import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useSubscription } from '@/hooks/useSubscription';
import { Plan, AlertChannel } from '@/lib/types';
import { PLAN_CONFIG, STRIPE_PRICE_IDS } from '@/lib/stripe-config';
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
  Loader2,
  CreditCard,
  AlertTriangle,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';

const integrations: { channel: AlertChannel; icon: any; name: string; description: string }[] = [
  { channel: 'discord', icon: MessageSquare, name: 'Discord', description: 'Receive alerts via Discord webhook' },
  { channel: 'email', icon: Mail, name: 'Email', description: 'Get notified via email' },
  { channel: 'slack', icon: Send, name: 'Slack', description: 'Post alerts to Slack channels' },
  { channel: 'telegram', icon: Send, name: 'Telegram', description: 'Receive alerts in Telegram' },
  { channel: 'sms', icon: Smartphone, name: 'SMS', description: 'Critical alerts via SMS (credits required)' },
];

export default function Settings() {
  const { user, profile, planLimits, deleteAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { subscription, isLoading: subLoading, isSubscribed, isPastDue, isCanceling, createCheckoutSession, openCustomerPortal } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<Plan | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Handle success/cancel redirects from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated successfully!');
      navigate('/settings', { replace: true });
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout canceled');
      navigate('/settings', { replace: true });
    }
  }, [searchParams, navigate]);

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

  const handleSelectPlan = async (planId: Plan) => {
    if (planId === 'free') {
      // For downgrade to free, open customer portal
      handleOpenPortal();
      return;
    }

    if (planId === profile?.plan) return;

    setIsProcessingPayment(planId);
    try {
      const priceId = STRIPE_PRICE_IDS[planId as Exclude<Plan, 'free'>];
      const result = await createCheckoutSession(priceId, planId);
      
      if (result.demo) {
        toast.info(result.message || 'Stripe is not configured. Add your API key to enable payments.');
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast.error('Failed to start checkout');
      console.error(error);
    } finally {
      setIsProcessingPayment(null);
    }
  };

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const result = await openCustomerPortal();
      
      if (result.demo) {
        toast.info(result.message || 'Stripe is not configured.');
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast.error('Failed to open billing portal');
      console.error(error);
    } finally {
      setIsOpeningPortal(false);
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

          {/* Subscription Status Banner */}
          {isPastDue && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-4 flex items-center gap-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Payment Failed</p>
                  <p className="text-sm text-muted-foreground">Please update your payment method to continue your subscription.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleOpenPortal} disabled={isOpeningPortal}>
                  {isOpeningPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Payment'}
                </Button>
              </CardContent>
            </Card>
          )}

          {isCanceling && subscription?.current_period_end && (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="p-4 flex items-center gap-4">
                <Calendar className="h-5 w-5 text-yellow-500" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-500">Subscription Ending</p>
                  <p className="text-sm text-muted-foreground">
                    Your plan will be downgraded to Free on {format(new Date(subscription.current_period_end), 'MMMM d, yyyy')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleOpenPortal} disabled={isOpeningPortal}>
                  {isOpeningPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reactivate'}
                </Button>
              </CardContent>
            </Card>
          )}

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

          {/* Billing Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Billing & Plans</h2>
              {isSubscribed && (
                <Button variant="outline" size="sm" onClick={handleOpenPortal} disabled={isOpeningPortal}>
                  {isOpeningPortal ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Manage Billing
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              )}
            </div>

            {/* Current Subscription Info */}
            {subscription && subscription.current_period_end && profile?.plan !== 'free' && (
              <Card className="card-gradient border-border/50 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current billing period ends</p>
                      <p className="font-medium">{format(new Date(subscription.current_period_end), 'MMMM d, yyyy')}</p>
                    </div>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'}>
                      {subscription.status === 'active' ? 'Active' : subscription.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              {(Object.keys(PLAN_CONFIG) as Plan[]).map((planId) => {
                const plan = PLAN_CONFIG[planId];
                const isCurrentPlan = profile?.plan === planId;
                const isUpgrade = profile?.plan === 'free' || 
                  (profile?.plan === 'starter' && planId === 'premium');
                const isDowngrade = (profile?.plan === 'premium' && planId !== 'premium') ||
                  (profile?.plan === 'starter' && planId === 'free');
                const isProcessing = isProcessingPayment === planId;

                return (
                  <Card 
                    key={planId}
                    className={cn(
                      'card-gradient border-border/50 transition-all relative overflow-hidden',
                      isCurrentPlan && 'border-primary ring-1 ring-primary',
                      plan.highlighted && !isCurrentPlan && 'border-primary/50'
                    )}
                  >
                    {plan.highlighted && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-bl">
                        Popular
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {isCurrentPlan && (
                          <Badge variant="secondary" className="bg-primary/20 text-primary">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                        {plan.priceAmount > 0 && (
                          <span className="text-muted-foreground">/{plan.interval}</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      
                      {!isCurrentPlan && (
                        <Button 
                          className="w-full"
                          variant={isUpgrade ? 'default' : 'outline'}
                          onClick={() => handleSelectPlan(planId)}
                          disabled={isProcessing || subLoading}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : isUpgrade ? (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Upgrade
                            </>
                          ) : (
                            'Downgrade'
                          )}
                        </Button>
                      )}
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSelectPlan(profile?.plan === 'free' ? 'starter' : 'premium')}
                          >
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
                          {isSubscribed && (
                            <span className="block mt-2 text-destructive font-medium">
                              Note: Your subscription will also be canceled.
                            </span>
                          )}
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