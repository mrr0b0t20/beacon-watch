export type Plan = 'free' | 'starter' | 'premium';

export type MonitorStatus = 'up' | 'down' | 'paused' | 'pending';

export type MonitorType = 'http' | 'keyword' | 'port';

export type AlertChannel = 'discord' | 'email' | 'slack' | 'telegram' | 'sms';

export interface User {
  id: string;
  email: string;
  plan: Plan;
  timezone: string;
  created_at: string;
}

export interface Monitor {
  id: string;
  user_id: string;
  url: string;
  name: string;
  monitor_type: MonitorType;
  interval_sec: number;
  region_mode: 'nearest' | 'multi' | 'all';
  keyword?: string;
  expected_status: number;
  status: MonitorStatus;
  last_checked?: string;
  uptime_percentage: number;
  avg_response_ms: number;
  created_at: string;
}

export interface CheckResult {
  id: string;
  monitor_id: string;
  region: string;
  status: MonitorStatus;
  response_ms: number;
  http_code: number;
  timestamp: string;
}

export interface Integration {
  user_id: string;
  discord_webhook?: string;
  slack_webhook?: string;
  telegram_bot_key?: string;
  email_enabled: boolean;
  sms_credits: number;
}

export interface PlanLimits {
  max_monitors: number;
  min_interval_sec: number;
  region_mode: 'nearest' | 'multi' | 'all';
  channels: AlertChannel[];
  retention_days: number;
  api_access: boolean;
  team_members: number;
  status_pages: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    max_monitors: 1,
    min_interval_sec: 600,
    region_mode: 'nearest',
    channels: ['discord'],
    retention_days: 7,
    api_access: false,
    team_members: 1,
    status_pages: 0,
  },
  starter: {
    max_monitors: 10,
    min_interval_sec: 60,
    region_mode: 'multi',
    channels: ['discord', 'email', 'slack', 'telegram'],
    retention_days: 30,
    api_access: false,
    team_members: 1,
    status_pages: 1,
  },
  premium: {
    max_monitors: 50,
    min_interval_sec: 30,
    region_mode: 'all',
    channels: ['discord', 'email', 'slack', 'telegram', 'sms'],
    retention_days: 90,
    api_access: true,
    team_members: 10,
    status_pages: 5,
  },
};

export const REGIONS = [
  { id: 'us-east', name: 'US East', flag: '🇺🇸' },
  { id: 'us-west', name: 'US West', flag: '🇺🇸' },
  { id: 'eu-west', name: 'EU West', flag: '🇪🇺' },
  { id: 'eu-central', name: 'EU Central', flag: '🇩🇪' },
  { id: 'ap-southeast', name: 'Asia Pacific', flag: '🇸🇬' },
  { id: 'ap-northeast', name: 'Japan', flag: '🇯🇵' },
];

export const INTERVAL_OPTIONS = [
  { value: 30, label: '30 seconds', plan: 'premium' as Plan },
  { value: 60, label: '1 minute', plan: 'starter' as Plan },
  { value: 180, label: '3 minutes', plan: 'starter' as Plan },
  { value: 300, label: '5 minutes', plan: 'starter' as Plan },
  { value: 600, label: '10 minutes', plan: 'free' as Plan },
];
