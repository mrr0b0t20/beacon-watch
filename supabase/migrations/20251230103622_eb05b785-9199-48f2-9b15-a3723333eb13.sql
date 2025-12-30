-- Create plan enum
CREATE TYPE public.plan_type AS ENUM ('free', 'starter', 'premium');

-- Create monitor status enum
CREATE TYPE public.monitor_status AS ENUM ('up', 'down', 'paused', 'pending');

-- Create monitor type enum
CREATE TYPE public.monitor_type AS ENUM ('http', 'keyword', 'port');

-- Create region mode enum
CREATE TYPE public.region_mode AS ENUM ('nearest', 'multi', 'all');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan plan_type NOT NULL DEFAULT 'free',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monitors table
CREATE TABLE public.monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  monitor_type monitor_type NOT NULL DEFAULT 'http',
  interval_sec INTEGER NOT NULL DEFAULT 600,
  region_mode region_mode NOT NULL DEFAULT 'nearest',
  keyword TEXT,
  expected_status INTEGER NOT NULL DEFAULT 200,
  status monitor_status NOT NULL DEFAULT 'pending',
  last_checked TIMESTAMP WITH TIME ZONE,
  uptime_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  avg_response_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create check_results table
CREATE TABLE public.check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES public.monitors(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  status monitor_status NOT NULL,
  response_ms INTEGER NOT NULL DEFAULT 0,
  http_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create integrations table
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  discord_webhook TEXT,
  slack_webhook TEXT,
  telegram_bot_key TEXT,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES public.monitors(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  message TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Monitors policies
CREATE POLICY "Users can view their own monitors"
ON public.monitors FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monitors"
ON public.monitors FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monitors"
ON public.monitors FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monitors"
ON public.monitors FOR DELETE
USING (auth.uid() = user_id);

-- Check results policies
CREATE POLICY "Users can view check results for their monitors"
ON public.check_results FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.monitors 
  WHERE monitors.id = check_results.monitor_id 
  AND monitors.user_id = auth.uid()
));

-- Integrations policies
CREATE POLICY "Users can view their own integrations"
ON public.integrations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integrations"
ON public.integrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
ON public.integrations FOR UPDATE
USING (auth.uid() = user_id);

-- Alerts policies
CREATE POLICY "Users can view alerts for their monitors"
ON public.alerts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.monitors 
  WHERE monitors.id = alerts.monitor_id 
  AND monitors.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monitors_updated_at
BEFORE UPDATE ON public.monitors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
BEFORE UPDATE ON public.integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan, timezone)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    COALESCE(NEW.raw_user_meta_data ->> 'timezone', 'UTC')
  );
  
  -- Also create default integrations entry
  INSERT INTO public.integrations (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better query performance
CREATE INDEX idx_monitors_user_id ON public.monitors(user_id);
CREATE INDEX idx_monitors_status ON public.monitors(status);
CREATE INDEX idx_check_results_monitor_id ON public.check_results(monitor_id);
CREATE INDEX idx_check_results_created_at ON public.check_results(created_at DESC);
CREATE INDEX idx_alerts_monitor_id ON public.alerts(monitor_id);
CREATE INDEX idx_alerts_created_at ON public.alerts(created_at DESC);