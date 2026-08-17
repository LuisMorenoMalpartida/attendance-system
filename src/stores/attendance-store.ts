import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type AttendanceType = 'check_in' | 'lunch_out' | 'lunch_in' | 'check_out' | 'active_break_start' | 'active_break_end' | 'bathroom_start' | 'bathroom_end';

export interface AttendanceRecord {
  id: number;
  type: AttendanceType;
  timestamp: string;
  notes: string | null;
  is_manual: boolean;
  latitude: number | null;
  longitude: number | null;
}

interface AttendanceState {
  todayRecords: AttendanceRecord[];
  lastRecord: AttendanceRecord | null;
  loading: boolean;
  error: string | null;
  success: string | null;
  setTodayRecords: (records: AttendanceRecord[]) => void;
  setLastRecord: (record: AttendanceRecord | null) => void;
  addRecord: (record: AttendanceRecord) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  clearMessages: () => void;
  reset: () => void;
}

const initialState = {
  todayRecords: [],
  lastRecord: null,
  loading: false,
  error: null,
  success: null,
};

export const useAttendanceStore = create<AttendanceState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        setTodayRecords: (records) => set({ todayRecords: records }),
        setLastRecord: (record) => set({ lastRecord: record }),
        addRecord: (record) =>
          set((state) => ({
            todayRecords: [...state.todayRecords, record],
            lastRecord: record,
          })),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        setSuccess: (success) => set({ success }),
        clearMessages: () => set({ error: null, success: null }),
        reset: () => set(initialState),
      }),
      {
        name: 'attendance-storage',
        partialize: (state) => ({
          todayRecords: state.todayRecords,
          lastRecord: state.lastRecord,
        }),
      }
    )
  )
);
