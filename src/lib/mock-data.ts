import { Monitor, User, CheckResult } from './types';

export const mockUser: User = {
  id: '1',
  email: 'demo@uptimepulse.io',
  plan: 'starter',
  timezone: 'America/New_York',
  created_at: new Date().toISOString(),
};

export const mockMonitors: Monitor[] = [
  {
    id: '1',
    user_id: '1',
    url: 'https://api.example.com',
    name: 'Production API',
    monitor_type: 'http',
    interval_sec: 60,
    region_mode: 'multi',
    expected_status: 200,
    status: 'up',
    last_checked: new Date(Date.now() - 45000).toISOString(),
    uptime_percentage: 99.98,
    avg_response_ms: 142,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    user_id: '1',
    url: 'https://app.example.com',
    name: 'Web Application',
    monitor_type: 'http',
    interval_sec: 60,
    region_mode: 'multi',
    expected_status: 200,
    status: 'up',
    last_checked: new Date(Date.now() - 30000).toISOString(),
    uptime_percentage: 99.95,
    avg_response_ms: 89,
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    user_id: '1',
    url: 'https://staging.example.com',
    name: 'Staging Server',
    monitor_type: 'http',
    interval_sec: 300,
    region_mode: 'nearest',
    expected_status: 200,
    status: 'down',
    last_checked: new Date(Date.now() - 120000).toISOString(),
    uptime_percentage: 95.42,
    avg_response_ms: 0,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    user_id: '1',
    url: 'https://docs.example.com',
    name: 'Documentation',
    monitor_type: 'keyword',
    keyword: 'Getting Started',
    interval_sec: 600,
    region_mode: 'nearest',
    expected_status: 200,
    status: 'paused',
    last_checked: new Date(Date.now() - 3600000).toISOString(),
    uptime_percentage: 100,
    avg_response_ms: 245,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const generateCheckResults = (monitorId: string, hours: number = 24): CheckResult[] => {
  const results: CheckResult[] = [];
  const now = Date.now();
  const interval = 60000; // 1 minute
  const points = Math.min(hours * 60, 1440);
  
  for (let i = 0; i < points; i++) {
    const isDown = Math.random() < 0.02;
    results.push({
      id: `${monitorId}-${i}`,
      monitor_id: monitorId,
      region: 'us-east',
      status: isDown ? 'down' : 'up',
      response_ms: isDown ? 0 : Math.floor(80 + Math.random() * 150),
      http_code: isDown ? 500 : 200,
      timestamp: new Date(now - i * interval).toISOString(),
    });
  }
  
  return results.reverse();
};
