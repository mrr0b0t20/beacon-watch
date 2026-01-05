-- Create subscriptions table to track Stripe subscriptions
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  plan_type public.plan_type NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(stripe_customer_id),
  UNIQUE(stripe_subscription_id)
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscription (for initial free tier)
CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can manage subscriptions (for webhook updates)
CREATE POLICY "Service role can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create subscription when profile is created
CREATE TRIGGER on_profile_created_create_subscription
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_subscription();