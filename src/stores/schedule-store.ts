import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface ScheduleState {
  schedules: DaySchedule[];
  loading: boolean;
  setSchedules: (schedules: DaySchedule[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useScheduleStore = create<ScheduleState>()(
  devtools((set) => ({
    schedules: [],
    loading: false,
    setSchedules: (schedules) => set({ schedules }),
    setLoading: (loading) => set({ loading }),
    reset: () => set({ schedules: [], loading: false }),
  }))
);
