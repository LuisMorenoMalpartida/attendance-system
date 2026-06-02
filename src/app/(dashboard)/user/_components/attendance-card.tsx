"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LogIn,
  LogOut,
  Coffee,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { getPeruNowTimestamp, formatTime } from '@/lib/date-utils';
import gsap from 'gsap';

type AttendanceType = 'check_in' | 'lunch_out' | 'lunch_in' | 'check_out';

interface LastRecord {
  type: AttendanceType;
  timestamp: string;
}

type MutationPayload = {
  type: AttendanceType;
  latitude: number | null;
  longitude: number | null;
  deviceInfo?: string;
  timestamp: string;
};

interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAY_NAMES: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mie',
  4: 'Jue',
  5: 'Vie',
  6: 'Sab',
};

export function AttendanceCard() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastRecord, setLastRecord] = useState<LastRecord | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);

  const isSaturday = new Date().getDay() === 6;
  const isSunday = new Date().getDay() === 0;
  const todayDayOfWeek = new Date().getDay();

  useEffect(() => {
    getCurrentLocation();
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) return;
      const meData = await meRes.json();
      const userId = meData.id;
      if (!userId) return;

      const res = await fetch(`/api/admin/users/${userId}/schedules`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Error al cargar horarios:', error);
    }
  };

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!navigator.geolocation) {
      console.warn('Geolocalizacion no soportada');
      return null;
    }
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      setLocation(coords);
      return coords;
    } catch (geoError: any) {
      setLocation(null);
      return null;
    }
  };

  const queryClient = useQueryClient();
  const today = getPeruNowTimestamp().split('T')[0];

  const { data: todayData } = useQuery({
    queryKey: ['attendance', today],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?date=${today}`);
      if (!res.ok) throw new Error('Error fetching attendance');
      return res.json();
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (todayData?.lastRecord) setLastRecord(todayData.lastRecord);
  }, [todayData]);

  useEffect(() => {
    try {
      const es = new EventSource('/api/attendance/stream');
      const onAttendance = (e: MessageEvent) => {
        try { JSON.parse(e.data); queryClient.invalidateQueries({ queryKey: ['attendance', today] }); } catch { }
      };
      es.addEventListener('attendance', onAttendance as EventListener);
      es.onerror = () => es.close();
      return () => { es.removeEventListener('attendance', onAttendance as EventListener); es.close(); };
    } catch { }
  }, [today, queryClient]);

  useGSAP(() => {
    gsap.fromTo('.attendance-action',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
    );
  }, []);

  const handleAttendanceRecord = async (type: AttendanceType) => {
    setError(null);
    setSuccess(null);
    setLoading(type);
    const currentLocation = await getCurrentLocation();
    const deviceTimestamp = getPeruNowTimestamp();
    try {
      await mutation.mutateAsync({
        type,
        latitude: currentLocation?.latitude ?? null,
        longitude: currentLocation?.longitude ?? null,
        deviceInfo: navigator.userAgent,
        timestamp: deviceTimestamp,
      });
      setSuccess(`${getTypeLabel(type)} registrado exitosamente!`);
      setLastRecord({ type, timestamp: deviceTimestamp });
      gsap.fromTo('.success-message',
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      // El error ya se maneja en onError del mutation
    } finally {
      setLoading(null);
    }
  };

  const mutation = useMutation({
    mutationFn: async (payload: MutationPayload) => {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!text || text.trim() === '') throw new Error('El servidor devolvio una respuesta vacia');
      let data;
      try { data = JSON.parse(text); }
      catch { throw new Error(`Error inesperado del servidor (${res.status})`); }
      if (!res.ok) throw new Error(data.error || `Error ${res.status} al registrar`);
      return data;
    },
    onMutate: async (newRecord: MutationPayload) => {
      await queryClient.cancelQueries({ queryKey: ['attendance', today] });
      const previous = queryClient.getQueryData(['attendance', today]);
      const optimisticRecord = { type: newRecord.type, timestamp: newRecord.timestamp };
      queryClient.setQueryData(['attendance', today], (old: any) => {
        if (!old) return { lastRecord: optimisticRecord, todayRecords: [optimisticRecord] };
        return { ...old, lastRecord: optimisticRecord, todayRecords: [...(old.todayRecords || []), optimisticRecord] };
      });
      setLastRecord({ type: newRecord.type, timestamp: newRecord.timestamp });
      return { previous };
    },
    onError: (err: unknown, newRecord: MutationPayload, context: any) => {
      setError(err instanceof Error ? err.message : 'Error al registrar');
      if (context?.previous) queryClient.setQueryData(['attendance', today], context.previous);
      setTimeout(() => setError(null), 5000);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', today] });
    },
  });

  const getTypeLabel = (type: AttendanceType): string => {
    const labels: Record<AttendanceType, string> = {
      check_in: 'Entrada',
      lunch_out: 'Salida a comer',
      lunch_in: 'Regreso de comer',
      check_out: 'Salida',
    };
    return labels[type];
  };

  const getNextAction = (): AttendanceType | null => {
    if (!lastRecord) return 'check_in';
    const flow: Record<AttendanceType, AttendanceType> = {
      check_in: 'lunch_out',
      lunch_out: 'lunch_in',
      lunch_in: 'check_out',
      check_out: 'check_in',
    };
    return flow[lastRecord.type] || 'check_in';
  };

  const isButtonDisabled = (type: AttendanceType): boolean => {
    if (loading) return true;
    if (isSunday) return true;
    if (isSaturday) {
      if (type === 'lunch_out' || type === 'lunch_in') return true;
      if (type === 'check_in') return lastRecord?.type === 'check_in';
      if (type === 'check_out') {
        if (!lastRecord) return true;
        if (lastRecord.type === 'check_out') return true;
        if (lastRecord.type === 'check_in') return false;
        return true;
      }
      return false;
    }
    const nextAction = getNextAction();
    if (!nextAction) return false;
    return type !== nextAction;
  };

  // Obtener horario de hoy
  const todaySchedule = schedules.find(s => s.day_of_week === todayDayOfWeek && s.is_active);

  // Formatear horario para mostrar
  const formatScheduleDisplay = () => {
    if (schedules.length === 0) return 'Lun-Vie 08:00 - 17:45 | Sab 09:00 - 12:00';
    const activeDays = schedules.filter(s => s.is_active).sort((a, b) => a.day_of_week - b.day_of_week);
    if (activeDays.length === 0) return 'Sin horario configurado';
    const groups: { days: number[]; start: string; end: string }[] = [];
    for (const day of activeDays) {
      const last = groups[groups.length - 1];
      if (last && last.start === day.start_time && last.end === day.end_time) {
        last.days.push(day.day_of_week);
      } else {
        groups.push({ days: [day.day_of_week], start: day.start_time, end: day.end_time });
      }
    }
    return groups.map(g => {
      const dayNames = g.days.map(d => DAY_NAMES[d]).join('-');
      return `${dayNames} ${g.start.substring(0, 5)} - ${g.end.substring(0, 5)}`;
    }).join(' | ');
  };

  return (
    <div className="attendance-card bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="relative h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Registro de Asistencia
            </h2>
            {/* Horario dinamico */}
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatScheduleDisplay()}
              </p>
              {schedules.length > 0 && (
                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
                >
                  {showSchedule ? 'Ocultar' : 'Ver detalle'}
                </button>
              )}
            </div>
            {/* Hoy */}
            {todaySchedule && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Hoy: {todaySchedule.start_time.substring(0, 5)} - {todaySchedule.end_time.substring(0, 5)}
              </p>
            )}
            {!todaySchedule && !isSunday && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                Hoy no tienes horario laboral configurado
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {location ? (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-xs font-medium">
                <MapPin className="w-3 h-3" />
                <span>Ubicacion OK</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                <AlertCircle className="w-3 h-3" />
                <span>Sin ubicacion</span>
              </div>
            )}
          </div>
        </div>

        {/* Detalle de horario expandible */}
        {showSchedule && schedules.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Horario semanal:</p>
            <div className="space-y-1">
              {schedules.sort((a, b) => a.day_of_week - b.day_of_week).map(s => (
                <div key={s.day_of_week} className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${s.is_active ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 line-through'}`}>
                    {DAY_NAMES[s.day_of_week]}
                  </span>
                  {s.is_active ? (
                    <span className="text-slate-500 dark:text-slate-400">
                      {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Descanso</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="error-message mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="success-message mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
          </div>
        )}

        {lastRecord && (
          <div className="mb-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ultimo registro:</p>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {getTypeLabel(lastRecord.type)}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {formatTime(lastRecord.timestamp)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleAttendanceRecord('check_in')} disabled={isButtonDisabled('check_in')}
            className={`attendance-action relative overflow-hidden p-4 rounded-xl font-medium text-white transition-all duration-300 bg-gradient-to-r from-blue-500 to-blue-600 ${isButtonDisabled('check_in') ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-700'}`}>
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading === 'check_in' ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn className="w-5 h-5" />}
              <span>Entrada</span>
            </div>
          </button>

          <button onClick={() => handleAttendanceRecord('lunch_out')} disabled={isButtonDisabled('lunch_out') || isSaturday || isSunday}
            className={`attendance-action relative overflow-hidden p-4 rounded-xl font-medium text-white transition-all duration-300 bg-gradient-to-r from-orange-500 to-orange-600 ${isButtonDisabled('lunch_out') || isSaturday || isSunday ? 'opacity-50 cursor-not-allowed' : 'hover:from-orange-600 hover:to-orange-700'}`}>
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading === 'lunch_out' ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Coffee className="w-5 h-5" />}
              <span>Salida Comida</span>
            </div>
          </button>

          <button onClick={() => handleAttendanceRecord('lunch_in')} disabled={isButtonDisabled('lunch_in') || isSaturday || isSunday}
            className={`attendance-action relative overflow-hidden p-4 rounded-xl font-medium text-white transition-all duration-300 bg-gradient-to-r from-green-500 to-green-600 ${isButtonDisabled('lunch_in') || isSaturday || isSunday ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-600 hover:to-green-700'}`}>
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading === 'lunch_in' ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Coffee className="w-5 h-5" />}
              <span>Regreso Comida</span>
            </div>
          </button>

          <button onClick={() => handleAttendanceRecord('check_out')} disabled={isButtonDisabled('check_out')}
            className={`attendance-action relative overflow-hidden p-4 rounded-xl font-medium text-white transition-all duration-300 bg-gradient-to-r from-red-500 to-red-600 ${isButtonDisabled('check_out') ? 'opacity-50 cursor-not-allowed' : 'hover:from-red-600 hover:to-red-700'}`}>
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading === 'check_out' ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogOut className="w-5 h-5" />}
              <span>Salida</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}