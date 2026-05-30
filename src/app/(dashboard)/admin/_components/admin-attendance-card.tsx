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
  Clock,
  Shield
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

export function AdminAttendanceCard() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastRecord, setLastRecord] = useState<LastRecord | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isSaturday = new Date().getDay() === 6;
  const isSunday = new Date().getDay() === 0;

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!navigator.geolocation) {
      console.warn('⚠️ Geolocalización no soportada');
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

      console.log('✅ Ubicación GPS obtenida:', coords);
      setLocation(coords);
      return coords;
    } catch (geoError: any) {
      console.warn('⚠️ Error GPS:', geoError.message);
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

  useGSAP(() => {
    gsap.fromTo('.attendance-action',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
    );
  }, []);

  const handleAttendanceRecord = async (type: AttendanceType) => {
    // Reset estados
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

      // Si llega aquí, fue exitoso
      setSuccess(`¡${getTypeLabel(type)} registrado exitosamente!`);
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

      // Lee como texto primero para evitar "unexpected end of JSON input"
      const text = await res.text();

      if (!text || text.trim() === '') {
        throw new Error('El servidor devolvió una respuesta vacía');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('❌ Respuesta no es JSON:', text);
        throw new Error(`Error inesperado del servidor (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status} al registrar`);
      }

      return data;
    },
    onMutate: async (newRecord: MutationPayload) => {
      await queryClient.cancelQueries({ queryKey: ['attendance', today] });
      const previous = queryClient.getQueryData(['attendance', today]);

      const optimistic = { type: newRecord.type, timestamp: newRecord.timestamp };
      queryClient.setQueryData(['attendance', today], (old: any) => {
        if (!old) return { lastRecord: optimistic, todayRecords: [optimistic] };
        return { ...old, lastRecord: optimistic, todayRecords: [...(old.todayRecords || []), optimistic] };
      });

      setLastRecord({ type: newRecord.type, timestamp: newRecord.timestamp });
      return { previous };
    },
    onError: (err: unknown, newRecord: MutationPayload, context: any) => {
      console.error('Error en mutación:', err);
      // Mostrar error en la UI
      setError(err instanceof Error ? err.message : 'Error al registrar');
      // Rollback
      if (context?.previous) {
        queryClient.setQueryData(['attendance', today], context.previous);
      }
      setTimeout(() => setError(null), 5000);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', today] });
      queryClient.invalidateQueries({ queryKey: ['admin-attendance-history'] });
    },
  });

  // SSE subscription to update admin card in real-time
  useEffect(() => {
    try {
      const es = new EventSource('/api/attendance/stream');
      const onAttendance = (e: MessageEvent) => {
        try {
          JSON.parse(e.data);
          queryClient.invalidateQueries({ queryKey: ['attendance', today] });
          // 👇 También actualizar historial admin cuando llegue evento SSE
          queryClient.invalidateQueries({ queryKey: ['admin-attendance-history'] });
        } catch { }
      };
      es.addEventListener('attendance', onAttendance as EventListener);
      es.onerror = () => es.close();
      return () => {
        es.removeEventListener('attendance', onAttendance as EventListener);
        es.close();
      };
    } catch { }
  }, [today, queryClient]);

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
    const nextAction = getNextAction();
    if (!nextAction) return false;
    return type !== nextAction;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="relative h-2 bg-linear-to-r from-amber-600 via-orange-600 to-red-600" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Mi Registro de Asistencia
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-xs font-medium">
                Admin
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Horario: Lun-Vie 08:00 - 17:45 | Sáb 09:00 - 12:00
            </p>
          </div>

          <div className="flex items-center gap-2">
            {location ? (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-xs font-medium">
                <MapPin className="w-3 h-3" />
                <span>GPS: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                <AlertCircle className="w-3 h-3" />
                <span>GPS no detectado</span>
              </div>
            )}
          </div>
        </div>

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
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Último registro:</p>
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
          <button
            onClick={() => handleAttendanceRecord('check_in')}
            disabled={isButtonDisabled('check_in')}
            className={`attendance-action relative overflow-hidden p-4 rounded-xl font-medium text-white transition-all duration-300 bg-linear-to-r from-blue-500 to-blue-600 ${isButtonDisabled('check_in') ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-700'}`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading === 'check_in' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              <span>Entrada</span>
            </div>
          </button>

          {/* Botón Salida Comida */}
          <button
            onClick={() => handleAttendanceRecord('lunch_out')}
            disabled={isButtonDisabled('lunch_out') || isSaturday || isSunday}
            className={`attendance-action relative overflow-hidden p-4 rounded-xl font-medium text-white transition-all duration-300 bg-gradient-to-r from-orange-500 to-orange-600 ${isButtonDisabled('lunch_out') || isSaturday || isSunday ? 'opacity-50 cursor-not-allowed' : 'hover:from-orange-600 hover:to-orange-700'
              }`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading === 'lunch_out' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Coffee className="w-5 h-5" />
              )}
              <span>Salida Comida</span>
              {isSaturday && <span className="text-xs opacity-75">(No disponible sábados)</span>}
            </div>
          </button>

          {/* Botón Regreso Comida */}
          <button
            onClick={() => handleAttendanceRecord('lunch_in')}
            disabled={isButtonDisabled('lunch_in') || isSaturday || isSunday}
            className={`attendance-action relative overflow-hidden p-4 rounded-xl font-medium text-white transition-all duration-300 bg-gradient-to-r from-green-500 to-green-600 ${isButtonDisabled('lunch_in') || isSaturday || isSunday ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-600 hover:to-green-700'
              }`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading === 'lunch_in' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Coffee className="w-5 h-5" />
              )}
              <span>Regreso Comida</span>
              {isSaturday && <span className="text-xs opacity-75">(No disponible sábados)</span>}
            </div>
          </button>

          <button
            onClick={() => handleAttendanceRecord('check_out')}
            disabled={isButtonDisabled('check_out')}
            className={`attendance-action relative overflow-hidden p-4 rounded-xl font-medium text-white transition-all duration-300 bg-linear-to-r from-red-500 to-red-600 ${isButtonDisabled('check_out') ? 'opacity-50 cursor-not-allowed' : 'hover:from-red-600 hover:to-red-700'}`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading === 'check_out' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
              <span>Salida</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}