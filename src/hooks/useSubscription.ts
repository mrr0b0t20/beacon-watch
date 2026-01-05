import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plan } from '@/lib/types';

interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_type: Plan;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
      } else {
        setSubscription(data as Subscription | null);
      }
      setIsLoading(false);
    };

    fetchSubscription();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setSubscription(null);
          } else {
            setSubscription(payload.new as Subscription);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createCheckoutSession = async (priceId: string, planType: Plan) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('create-checkout', {
      body: { priceId, planType },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    if (response.data.demo) {
      return { demo: true, message: response.data.message };
    }

    return { url: response.data.url };
  };

  const openCustomerPortal = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('customer-portal', {});

    if (response.error) {
      throw new Error(response.error.message);
    }

    if (response.data.demo) {
      return { demo: true, message: response.data.message };
    }

    return { url: response.data.url };
  };

  const isSubscribed = subscription?.status === 'active' && subscription.plan_type !== 'free';
  const isPastDue = subscription?.status === 'past_due';
  const isCanceling = subscription?.cancel_at_period_end === true;

  return {
    subscription,
    isLoading,
    isSubscribed,
    isPastDue,
    isCanceling,
    createCheckoutSession,
    openCustomerPortal,
  };
}