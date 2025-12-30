import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Monitor, CheckResult } from '@/lib/types';
import { mockMonitors, generateCheckResults } from '@/lib/mock-data';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface MonitorContextType {
  monitors: Monitor[];
  isLoading: boolean;
  addMonitor: (monitor: Omit<Monitor, 'id' | 'user_id' | 'status' | 'last_checked' | 'uptime_percentage' | 'avg_response_ms' | 'created_at'>) => Promise<boolean>;
  updateMonitor: (id: string, updates: Partial<Monitor>) => void;
  deleteMonitor: (id: string) => void;
  pauseMonitor: (id: string) => void;
  resumeMonitor: (id: string) => void;
  getCheckResults: (monitorId: string) => CheckResult[];
}

const MonitorContext = createContext<MonitorContextType | undefined>(undefined);

export function MonitorProvider({ children }: { children: ReactNode }) {
  const { user, planLimits } = useAuth();
  const [monitors, setMonitors] = useState<Monitor[]>(mockMonitors);
  const [isLoading, setIsLoading] = useState(false);

  const addMonitor = async (monitorData: Omit<Monitor, 'id' | 'user_id' | 'status' | 'last_checked' | 'uptime_percentage' | 'avg_response_ms' | 'created_at'>) => {
    if (!user || !planLimits) return false;

    // Plan enforcement
    if (monitors.length >= planLimits.max_monitors) {
      toast.error(`You've reached your plan limit of ${planLimits.max_monitors} monitor(s)`, {
        description: 'Upgrade your plan to add more monitors',
        action: {
          label: 'Upgrade',
          onClick: () => {},
        },
      });
      return false;
    }

    if (monitorData.interval_sec < planLimits.min_interval_sec) {
      toast.error('Check interval not available on your plan', {
        description: `Minimum interval: ${planLimits.min_interval_sec} seconds`,
      });
      return false;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const newMonitor: Monitor = {
      ...monitorData,
      id: crypto.randomUUID(),
      user_id: user.id,
      status: 'pending',
      uptime_percentage: 100,
      avg_response_ms: 0,
      created_at: new Date().toISOString(),
    };

    setMonitors(prev => [...prev, newMonitor]);
    setIsLoading(false);
    
    toast.success('Monitor created', {
      description: `Monitoring ${monitorData.url}`,
    });
    
    return true;
  };

  const updateMonitor = (id: string, updates: Partial<Monitor>) => {
    setMonitors(prev =>
      prev.map(m => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const deleteMonitor = (id: string) => {
    setMonitors(prev => prev.filter(m => m.id !== id));
    toast.success('Monitor deleted');
  };

  const pauseMonitor = (id: string) => {
    updateMonitor(id, { status: 'paused' });
    toast.info('Monitor paused');
  };

  const resumeMonitor = (id: string) => {
    updateMonitor(id, { status: 'pending' });
    toast.success('Monitor resumed');
  };

  const getCheckResults = (monitorId: string): CheckResult[] => {
    return generateCheckResults(monitorId, 24);
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
