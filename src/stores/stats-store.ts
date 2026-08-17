import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Stats {
  daysWorkedThisMonth: number;
  averageCheckIn: string;
  averageCheckOut: string;
  totalHoursThisMonth: number;
  lateArrivals: number;
  lunchTimeAverage: string;
  totalHoursToday?: number;
}

interface StatsState {
  stats: Stats;
  loading: boolean;
  setStats: (stats: Stats) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialStats: Stats = {
  daysWorkedThisMonth: 0,
  averageCheckIn: '--:--',
  averageCheckOut: '--:--',
  totalHoursThisMonth: 0,
  lateArrivals: 0,
  lunchTimeAverage: '--:--',
  totalHoursToday: 0,
};

export const useStatsStore = create<StatsState>()(
  devtools((set) => ({
    stats: initialStats,
    loading: false,
    setStats: (stats) => set({ stats }),
    setLoading: (loading) => set({ loading }),
    reset: () => set({ stats: initialStats, loading: false }),
  }))
);
