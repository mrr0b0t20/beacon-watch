import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Monitor, CheckResult, MonitorStatus, MonitorType } from '@/lib/types';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface MonitorContextType {
  monitors: Monitor[];
  isLoading: boolean;
  addMonitor: (monitor: Omit<Monitor, 'id' | 'user_id' | 'status' | 'last_checked' | 'uptime_percentage' | 'avg_response_ms' | 'created_at'>) => Promise<boolean>;
  updateMonitor: (id: string, updates: Partial<Monitor>) => Promise<void>;
  deleteMonitor: (id: string) => Promise<void>;
  pauseMonitor: (id: string) => Promise<void>;
  resumeMonitor: (id: string) => Promise<void>;
  getCheckResults: (monitorId: string) => Promise<CheckResult[]>;
  refreshMonitors: () => Promise<void>;
}

const MonitorContext = createContext<MonitorContextType | undefined>(undefined);

export function MonitorProvider({ children }: { children: ReactNode }) {
  const { user, profile, planLimits } = useAuth();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMonitors = useCallback(async () => {
    if (!user) {
      setMonitors([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('monitors')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching monitors:', error);
      toast.error('Failed to load monitors');
    } else {
      // Map database fields to frontend types
      const mappedMonitors: Monitor[] = (data || []).map((m) => ({
        id: m.id,
        user_id: m.user_id,
        url: m.url,
        name: m.name,
        monitor_type: m.monitor_type as MonitorType,
        interval_sec: m.interval_sec,
        region_mode: m.region_mode as 'nearest' | 'multi' | 'all',
        keyword: m.keyword ?? undefined,
        expected_status: m.expected_status,
        status: m.status as MonitorStatus,
        last_checked: m.last_checked ?? undefined,
        uptime_percentage: Number(m.uptime_percentage),
        avg_response_ms: m.avg_response_ms,
        created_at: m.created_at,
      }));
      setMonitors(mappedMonitors);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  const refreshMonitors = async () => {
    await fetchMonitors();
  };

  const addMonitor = async (monitorData: Omit<Monitor, 'id' | 'user_id' | 'status' | 'last_checked' | 'uptime_percentage' | 'avg_response_ms' | 'created_at'>) => {
    if (!user || !planLimits) return false;

    // Plan enforcement
    if (monitors.length >= planLimits.max_monitors) {
      toast.error(`You've reached your plan limit of ${planLimits.max_monitors} monitor(s)`, {
        description: 'Upgrade your plan to add more monitors',
      });
      return false;
    }

    if (monitorData.interval_sec < planLimits.min_interval_sec) {
      toast.error('Check interval not available on your plan', {
        description: `Minimum interval: ${planLimits.min_interval_sec} seconds`,
      });
      return false;
    }

    const { data, error } = await supabase
      .from('monitors')
      .insert({
        user_id: user.id,
        url: monitorData.url,
        name: monitorData.name,
        monitor_type: monitorData.monitor_type,
        interval_sec: monitorData.interval_sec,
        region_mode: monitorData.region_mode,
        keyword: monitorData.keyword || null,
        expected_status: monitorData.expected_status,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating monitor:', error);
      toast.error('Failed to create monitor');
      return false;
    }

    const newMonitor: Monitor = {
      id: data.id,
      user_id: data.user_id,
      url: data.url,
      name: data.name,
      monitor_type: data.monitor_type as MonitorType,
      interval_sec: data.interval_sec,
      region_mode: data.region_mode as 'nearest' | 'multi' | 'all',
      keyword: data.keyword ?? undefined,
      expected_status: data.expected_status,
      status: data.status as MonitorStatus,
      last_checked: data.last_checked ?? undefined,
      uptime_percentage: Number(data.uptime_percentage),
      avg_response_ms: data.avg_response_ms,
      created_at: data.created_at,
    };

    setMonitors(prev => [newMonitor, ...prev]);
    toast.success('Monitor created', {
      description: `Monitoring ${monitorData.url}`,
    });
    
    return true;
  };

  const updateMonitor = async (id: string, updates: Partial<Monitor>) => {
    const { error } = await supabase
      .from('monitors')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating monitor:', error);
      toast.error('Failed to update monitor');
      return;
    }

    setMonitors(prev =>
      prev.map(m => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const deleteMonitor = async (id: string) => {
    const { error } = await supabase
      .from('monitors')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting monitor:', error);
      toast.error('Failed to delete monitor');
      return;
    }

    setMonitors(prev => prev.filter(m => m.id !== id));
    toast.success('Monitor deleted');
  };

  const pauseMonitor = async (id: string) => {
    await updateMonitor(id, { status: 'paused' });
    toast.info('Monitor paused');
  };

  const resumeMonitor = async (id: string) => {
    await updateMonitor(id, { status: 'pending' });
    toast.success('Monitor resumed');
  };

  const getCheckResults = async (monitorId: string): Promise<CheckResult[]> => {
    const { data, error } = await supabase
      .from('check_results')
      .select('*')
      .eq('monitor_id', monitorId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching check results:', error);
      return [];
    }

    return (data || []).map((r) => ({
      id: r.id,
      monitor_id: r.monitor_id,
      region: r.region,
      status: r.status as MonitorStatus,
      response_ms: r.response_ms,
      http_code: r.http_code ?? 0,
      timestamp: r.created_at,
    }));
  };

  return (
    <MonitorContext.Provider
      value={{
        monitors,
        isLoading,
        addMonitor,
        updateMonitor,
        deleteMonitor,
        pauseMonitor,
        resumeMonitor,
        getCheckResults,
        refreshMonitors,
      }}
    >
      {children}
    </MonitorContext.Provider>
  );
}

export function useMonitors() {
  const context = useContext(MonitorContext);
  if (context === undefined) {
    throw new Error('useMonitors must be used within a MonitorProvider');
  }
  return context;
}
