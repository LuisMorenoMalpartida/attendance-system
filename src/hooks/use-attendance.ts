'use client';

import { useState, useEffect } from 'react';

interface Location {
  latitude: number;
  longitude: number;
}

export function useAttendance() {
  const [location, setLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError(null);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Permiso de ubicación denegado. Ve a configuración de tu navegador para habilitarlo.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Ubicación no disponible. Verifica tu conexión GPS.');
            break;
          case error.TIMEOUT:
            setLocationError('Tiempo de espera agotado. Intenta de nuevo.');
            break;
          default:
            setLocationError('Error al obtener ubicación');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minuto de caché
      }
    );
  };

  const registerAttendance = async (type: 'check_in' | 'lunch_out' | 'lunch_in' | 'check_out') => {
    if (!location) {
      throw new Error('No se pudo obtener la ubicación. Activa el GPS e intenta de nuevo.');
    }

    setLoading(true);

    try {
      // Construir timestamp local del dispositivo en formato "YYYY-MM-DD HH:MM:SS"
      const getDeviceLocalTimestampString = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
      };

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          latitude: location.latitude,
          longitude: location.longitude,
          deviceInfo: navigator.userAgent,
          timestamp: getDeviceLocalTimestampString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al registrar asistencia');
      }

      return await response.json();
    } finally {
      setLoading(false);
    }
  };

  const refreshLocation = () => {
    requestLocation();
  };

  return {
    location,
    locationError,
    loading,
    registerAttendance,
    refreshLocation,
  };
}