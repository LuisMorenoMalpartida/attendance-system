'use client';

import { useState, useEffect } from 'react';
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

export function AttendanceCard() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastRecord, setLastRecord] = useState<LastRecord | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation();
    fetchLastRecord();
  }, []);

  // 👇 Nueva función para obtener ubicación (igual que el admin)
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

  const fetchLastRecord = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/attendance?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        if (data.lastRecord) {
          setLastRecord(data.lastRecord);
        }
      }
    } catch (error) {
      console.error('Error al cargar último registro:', error);
    }
  };

  useGSAP(() => {
    gsap.fromTo('.attendance-action',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
    );
  }, []);

  const handleAttendanceRecord = async (type: AttendanceType) => {
    try {
      setLoading(type);
      setError(null);
      setSuccess(null);

      // 👇 Obtener ubicación fresca
      const currentLocation = await getCurrentLocation();

      // 👇 Obtener timestamp en hora Perú
      const peruTimestamp = getPeruNowTimestamp();
      console.log('📤 Enviando timestamp Perú:', peruTimestamp);

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          latitude: currentLocation?.latitude ?? null,
          longitude: currentLocation?.longitude ?? null,
          deviceInfo: navigator.userAgent,
          timestamp: peruTimestamp, // 👈 Enviar timestamp
        }),
      });

      const data = await response.json();
      console.log('📥 Respuesta:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar');
      }

      setSuccess(`¡${getTypeLabel(type)} registrado exitosamente!`);
      setLastRecord({ type, timestamp: peruTimestamp });
      
      gsap.fromTo('.success-message',
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
      );

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      gsap.fromTo('.error-message',
        { x: -10, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(null);
    }
  };

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
    <div className="attendance-card bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="relative h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Registro de Asistencia
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Horario: 08:00 - 17:45
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {location ? (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-xs font-medium">
                <MapPin className="w-3 h-3" />
                <span>Ubicación OK</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                <AlertCircle className="w-3 h-3" />
                <span>Sin ubicación</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="success-message mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
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
          <button onClick={() => handleAttendanceRecord('check_in')} disabled={isButtonDisabled('check_in')}
            className={`attendance-action relative overflow-hidden p-4 rounded-xl font-medium text-white transition-all duration-300 bg-gradient-to-r from-blue-500 to-blue-600 ${isButtonDisabled('check_in') ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-700'}`}>
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading === 'check_in' ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn className="w-5 h-5" />}
              <span>Entrada</span>
            </div>
          </button>

          <button onClick={() => handleAttendanceRecord('lunch_out')} disabled={isButtonDisabled('lunch_out')}
            className={`attendance-action relative overflow-hidden p-4 rounded-xl font-medium text-white transition-all duration-300 bg-gradient-to-r from-orange-500 to-orange-600 ${isButtonDisabled('lunch_out') ? 'opacity-50 cursor-not-allowed' : 'hover:from-orange-600 hover:to-orange-700'}`}>
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading === 'lunch_out' ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Coffee className="w-5 h-5" />}
              <span>Salida Comida</span>
            </div>
          </button>

          <button onClick={() => handleAttendanceRecord('lunch_in')} disabled={isButtonDisabled('lunch_in')}
            className={`attendance-action relative overflow-hidden p-4 rounded-xl font-medium text-white transition-all duration-300 bg-gradient-to-r from-green-500 to-green-600 ${isButtonDisabled('lunch_in') ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-600 hover:to-green-700'}`}>
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